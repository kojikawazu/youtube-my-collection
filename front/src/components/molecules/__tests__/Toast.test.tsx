import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// framer-motion のアニメーションは外部 I/O 相当。DOM 検証に集中するためスタブ化する。
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) =>
      React.createElement("div", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { Toast } from "../Toast";

describe("Toast", () => {
  // --- 正常系 ---

  it("メッセージを status ロールの live region として通知する", () => {
    render(<Toast message="保存しました" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("保存しました");
  });

  // --- 準正常系 ---

  it("message が null でも live region は DOM 上に残る（後挿入だと読み上げられないため）", () => {
    render(<Toast message={null} />);
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();
  });
});
