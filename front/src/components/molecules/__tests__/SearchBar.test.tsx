import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "../SearchBar";

describe("SearchBar", () => {
  // --- 正常系 ---

  it("value を表示する（制御コンポーネント）", () => {
    render(<SearchBar value="react" onChange={() => {}} />);
    expect(screen.getByPlaceholderText("キーワードを検索...")).toHaveValue("react");
  });

  it("入力すると onChange に新しい値を渡す", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("キーワードを検索..."), {
      target: { value: "vue" },
    });
    expect(onChange).toHaveBeenCalledWith("vue");
  });
});
