import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { YoutubeIcon } from "../YoutubeIcon";

describe("YoutubeIcon", () => {
  // --- 正常系 ---

  it("24x24 の線画として描画され、線の色は文字色（currentColor）に従う", () => {
    const { container } = render(<YoutubeIcon className="h-5 w-5 text-white" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.getAttribute("fill")).toBe("none");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
    expect(svg?.querySelectorAll("path")).toHaveLength(2);
  });

  it("className をそのまま svg に渡す", () => {
    const { container } = render(<YoutubeIcon className="h-5 w-5 text-white" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toBe("h-5 w-5 text-white");
  });

  // --- 準正常系 ---

  it("className を省略しても描画でき、class 属性を持たない", () => {
    const { container } = render(<YoutubeIcon />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.hasAttribute("class")).toBe(false);
  });

  it("装飾用のため支援技術から隠され、隣のテキストだけがリンク名になる", () => {
    render(
      <a href="https://www.youtube.com/watch?v=abc">
        <YoutubeIcon className="h-6 w-6" />
        <span>YouTube を開く</span>
      </a>,
    );
    expect(screen.getByRole("link", { name: "YouTube を開く" })).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
