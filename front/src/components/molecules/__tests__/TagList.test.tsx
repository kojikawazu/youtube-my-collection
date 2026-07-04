import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TagList } from "../TagList";

describe("TagList", () => {
  // --- 正常系 ---

  it("各タグを # 付きで表示する", () => {
    render(<TagList tags={["react", "nextjs"]} />);
    expect(screen.getByText("#react")).toBeInTheDocument();
    expect(screen.getByText("#nextjs")).toBeInTheDocument();
  });

  // --- 準正常系 ---

  it("空配列ならチップを描画しない", () => {
    const { container } = render(<TagList tags={[]} />);
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });
});
