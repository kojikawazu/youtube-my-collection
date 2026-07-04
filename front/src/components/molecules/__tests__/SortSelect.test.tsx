import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortSelect } from "../SortSelect";

describe("SortSelect", () => {
  // --- 正常系 ---

  it("選択中の値を表示する", () => {
    render(<SortSelect value="rating" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("rating");
  });

  it("変更すると onChange に選択値を渡す", () => {
    const onChange = vi.fn();
    render(<SortSelect value="newest" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "rating" } });
    expect(onChange).toHaveBeenCalledWith("rating");
  });
});
