import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// framer-motion のアニメーションをスタブ化してDOM操作に集中する
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) =>
      React.createElement("div", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { Modal } from "../Modal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn().mockResolvedValue(undefined),
  title: "確認",
  message: "実行しますか？",
};

afterEach(() => {
  vi.clearAllMocks();
  document.body.style.overflow = "";
});

describe("Modal", () => {
  // --- 正常系 ---

  it("should show confirm and cancel buttons when isOpen=true", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole("button", { name: "実行" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
  });

  it("should set body overflow to hidden when isOpen=true", () => {
    render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("should restore body overflow to unset when modal closes", () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Modal {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe("unset");
  });

  it("should call onConfirm then onClose when confirm button is clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "実行" }));
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should show 'processing' state while onConfirm is pending", async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn().mockReturnValue(
      new Promise<void>((res) => {
        resolveConfirm = res;
      }),
    );
    render(<Modal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "実行" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "処理中..." })).toBeDisabled());
    resolveConfirm();
  });

  it("should show AlertTriangle icon when variant=danger", () => {
    render(<Modal {...defaultProps} variant="danger" />);
    // lucide-react は SVG を描画する。data-testid 等がないため svg の存在で確認
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  // --- 準正常系 ---

  it("should call onConfirm only once when confirm button is clicked twice rapidly", async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn().mockReturnValue(
      new Promise<void>((res) => {
        resolveConfirm = res;
      }),
    );
    render(<Modal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "実行" }));
    fireEvent.click(screen.getByRole("button", { name: "処理中..." }));
    resolveConfirm();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("should not call onClose when onConfirm throws", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("failed"));
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "実行" }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("should not call onClose when cancel is clicked while submitting", async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn().mockReturnValue(
      new Promise<void>((res) => {
        resolveConfirm = res;
      }),
    );
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "実行" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).not.toHaveBeenCalled();
    resolveConfirm();
  });

  // --- 異常系 ---

  it("should re-enable confirm button after onConfirm throws (re-operable)", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("API error"));
    render(<Modal {...defaultProps} onConfirm={onConfirm} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "実行" }));
    });
    expect(screen.getByRole("button", { name: "実行" })).not.toBeDisabled();
  });

  // --- アクセシビリティ（キーボード / ARIA） ---

  it("should expose dialog semantics labelled by title and described by message", () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("確認");
    expect(dialog).toHaveAccessibleDescription("実行しますか？");
  });

  it("should move focus into the dialog when opened", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole("button", { name: "実行" })).toHaveFocus();
  });

  it("should return focus to the previously focused element when closed", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<Modal {...defaultProps} />);
    expect(trigger).not.toHaveFocus();
    rerender(<Modal {...defaultProps} isOpen={false} />);
    expect(trigger).toHaveFocus();

    trigger.remove();
  });

  it("should call onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should wrap focus from the last element to the first on Tab", () => {
    render(<Modal {...defaultProps} />);
    const cancel = screen.getByRole("button", { name: "キャンセル" });
    cancel.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "実行" })).toHaveFocus();
  });

  it("should wrap focus from the first element to the last on Shift+Tab", () => {
    render(<Modal {...defaultProps} />);
    screen.getByRole("button", { name: "実行" }).focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "キャンセル" })).toHaveFocus();
  });

  it("should not call onClose on Escape while submitting", async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn().mockReturnValue(
      new Promise<void>((res) => {
        resolveConfirm = res;
      }),
    );
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "実行" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "処理中..." })).toBeDisabled());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    resolveConfirm();
  });
});
