import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../Header";

const baseProps = {
  isAdmin: false,
  onLogout: vi.fn(),
  onLogin: vi.fn(),
  onLogoClick: vi.fn(),
};

describe("Header", () => {
  // --- 正常系 ---

  it("ロゴを button として公開し、クリックで onLogoClick を呼ぶ", () => {
    const onLogoClick = vi.fn();
    render(<Header {...baseProps} onLogoClick={onLogoClick} />);
    const logo = screen.getByRole("button", { name: "MyYouTubeHub" });
    logo.focus();
    expect(logo).toHaveFocus();
    fireEvent.click(logo);
    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });

  it("非管理者ではログインボタンを表示する", () => {
    render(<Header {...baseProps} />);
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  // --- 準正常系 ---

  it("管理者ではログアウトボタンを表示しログインボタンを表示しない", () => {
    render(<Header {...baseProps} isAdmin={true} />);
    expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ログイン" })).not.toBeInTheDocument();
  });
});
