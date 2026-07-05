import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { VideoItem } from "@/types";
import { VideoForm } from "../VideoForm";

const formData: Partial<VideoItem> = {
  title: "",
  youtubeUrl: "",
  category: "プログラミング",
  rating: 3,
  tags: [],
  goodPoints: "",
  memo: "",
};

const baseProps = {
  mode: "add" as const,
  formData,
  formErrors: {},
  onFormChange: vi.fn(),
  onErrorClear: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe("VideoForm", () => {
  // --- 正常系 ---

  it("mode=add で「動画を追加」を表示する", () => {
    render(<VideoForm {...baseProps} />);
    expect(screen.getByRole("heading", { name: "動画を追加" })).toBeInTheDocument();
  });

  it("mode=edit で「情報を編集」を表示する", () => {
    render(<VideoForm {...baseProps} mode="edit" />);
    expect(screen.getByRole("heading", { name: "情報を編集" })).toBeInTheDocument();
  });

  it("タイトル入力で onFormChange に反映する", () => {
    const onFormChange = vi.fn();
    render(<VideoForm {...baseProps} onFormChange={onFormChange} />);
    fireEvent.change(screen.getByPlaceholderText("印象的なタイトルを..."), {
      target: { value: "新しいタイトル" },
    });
    expect(onFormChange).toHaveBeenCalledWith(expect.objectContaining({ title: "新しいタイトル" }));
  });

  it("評価ボタンで onFormChange に rating を渡す", () => {
    const onFormChange = vi.fn();
    render(<VideoForm {...baseProps} onFormChange={onFormChange} />);
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onFormChange).toHaveBeenCalledWith(expect.objectContaining({ rating: 5 }));
  });

  it("保存・キャンセルで各コールバックを呼ぶ", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<VideoForm {...baseProps} onSave={onSave} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "保存して更新" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // --- 準正常系（エラー表示・解消） ---

  it("formErrors のフィールドエラーを表示する", () => {
    render(<VideoForm {...baseProps} formErrors={{ title: "タイトルは必須です。" }} />);
    expect(screen.getByText("タイトルは必須です。")).toBeInTheDocument();
  });

  it("エラーがある状態で入力すると onErrorClear を呼ぶ", () => {
    const onErrorClear = vi.fn();
    render(<VideoForm {...baseProps} formErrors={{ title: "必須" }} onErrorClear={onErrorClear} />);
    fireEvent.change(screen.getByPlaceholderText("印象的なタイトルを..."), {
      target: { value: "x" },
    });
    expect(onErrorClear).toHaveBeenCalledWith("title");
  });
});
