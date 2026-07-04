import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// framer-motion のアニメーションをスタブ化し、ボタンの導線検証に集中する。
vi.mock("framer-motion", () => ({
  motion: {
    div: (props: Record<string, unknown>) => {
      const { children, ...rest } = props;
      // framer-motion 固有 props は DOM 要素に渡さない。
      for (const k of [
        "layout",
        "animate",
        "initial",
        "exit",
        "transition",
        "whileHover",
        "whileTap",
      ]) {
        delete rest[k];
      }
      return React.createElement("div", rest, children as React.ReactNode);
    },
  },
}));

import { LoginScreen } from "../LoginScreen";

describe("LoginScreen", () => {
  // --- 正常系 ---

  it("Google ログインボタンで onGoogleLogin を呼ぶ", () => {
    const onGoogleLogin = vi.fn();
    render(<LoginScreen onGoogleLogin={onGoogleLogin} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Googleでログイン/ }));
    expect(onGoogleLogin).toHaveBeenCalledTimes(1);
  });

  it("戻るボタンで onBack を呼ぶ", () => {
    const onBack = vi.fn();
    render(<LoginScreen onGoogleLogin={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "コレクションへ戻る" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
