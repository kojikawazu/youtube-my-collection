import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Rating } from "../Rating";

describe("Rating", () => {
  // --- 正常系 ---

  it("value と max を aria-label に反映する", () => {
    render(<Rating value={3} />);
    expect(screen.getByLabelText("評価 3 / 5")).toBeInTheDocument();
  });

  it("value 個の星が塗られ、残りは未塗りになる", () => {
    const { container } = render(<Rating value={2} />);
    const stars = container.querySelectorAll("svg");
    expect(stars).toHaveLength(5);
    const filled = [...stars].filter((s) => s.classList.contains("text-red-400"));
    expect(filled).toHaveLength(2);
  });

  // --- 準正常系 ---

  it("max を変えられ、value=0 でも破綻しない", () => {
    const { container } = render(<Rating value={0} max={3} />);
    expect(screen.getByLabelText("評価 0 / 3")).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(3);
    expect(
      [...container.querySelectorAll("svg")].filter((s) => s.classList.contains("text-red-400")),
    ).toHaveLength(0);
  });
});
