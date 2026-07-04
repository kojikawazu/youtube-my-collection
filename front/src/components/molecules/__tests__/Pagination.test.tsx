import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "../Pagination";

const base = {
  currentPage: 3,
  totalPages: 5,
  visiblePageNumbers: [1, 2, 3, 4, 5],
  onPageChange: vi.fn(),
};

describe("Pagination", () => {
  // --- 正常系 ---

  it("ページ番号ボタンと「現在 / 総ページ」を表示する", () => {
    render(<Pagination {...base} onPageChange={vi.fn()} />);
    [1, 2, 3, 4, 5].forEach((p) =>
      expect(screen.getByRole("button", { name: String(p) })).toBeInTheDocument(),
    );
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
  });

  it("ページ番号クリックで onPageChange にその番号を渡す", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...base} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("「次へ」は totalPages を超えない値で呼ぶ", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...base} currentPage={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  // --- 準正常系（端の無効化） ---

  it("先頭ページでは「前へ」が無効・「次へ」が有効", () => {
    render(<Pagination {...base} currentPage={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });

  it("最終ページでは「次へ」が無効", () => {
    render(<Pagination {...base} currentPage={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });
});
