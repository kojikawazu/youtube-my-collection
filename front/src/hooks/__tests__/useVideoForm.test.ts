import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVideoForm } from "../useVideoForm";
import type { VideoItem } from "@/lib/types";

const makeVideo = (overrides: Partial<VideoItem> = {}): VideoItem => ({
  id: "video-1",
  title: "テスト動画",
  youtubeUrl: "https://youtube.com/watch?v=abc",
  thumbnailUrl: "",
  tags: ["React"],
  category: "プログラミング",
  rating: 4,
  addedDate: "2024-01-01T00:00:00Z",
  publishDate: null,
  goodPoints: "良かった点",
  memo: "メモ",
  ...overrides,
});

const makeOptions = (overrides = {}) => ({
  accessToken: "test-token",
  showToast: vi.fn(),
  refreshListPage: vi.fn().mockResolvedValue(undefined),
  refreshCurrentPage: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("useVideoForm", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  // --- 正常系 ---

  it("should initialize form with defaults on initAdd", () => {
    const { result } = renderHook(() => useVideoForm(makeOptions()));
    act(() => { result.current.initAdd(); });
    expect(result.current.formData.category).toBe("プログラミング");
    expect(result.current.formData.rating).toBe(3);
    expect(result.current.formErrors).toEqual({});
  });

  it("should copy video data on initEdit", () => {
    const video = makeVideo();
    const { result } = renderHook(() => useVideoForm(makeOptions()));
    act(() => { result.current.initEdit(video); });
    expect(result.current.formData).toMatchObject(video);
    expect(result.current.formErrors).toEqual({});
  });

  it("should update field and clear corresponding error on updateField", () => {
    const { result } = renderHook(() => useVideoForm(makeOptions()));
    act(() => { result.current.initAdd(); });
    // バリデーションエラーを発生させる
    act(() => { result.current.handleSave("add"); });
    act(() => { result.current.updateField("title", "新タイトル"); });
    expect(result.current.formData.title).toBe("新タイトル");
    expect(result.current.formErrors.title).toBeUndefined();
  });

  it("should return valid=true and call POST on handleSave(add) with valid data", async () => {
    const showToast = vi.fn();
    const refreshListPage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => makeVideo(),
    }));
    const { result } = renderHook(() => useVideoForm(makeOptions({ showToast, refreshListPage })));
    act(() => { result.current.initAdd(); });
    act(() => {
      result.current.updateField("title", "テスト");
      result.current.updateField("youtubeUrl", "https://youtube.com/watch?v=abc");
    });
    let saveResult: { action: () => Promise<unknown>; valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("add"); });
    expect(saveResult!.valid).toBe(true);
    await act(async () => { await saveResult!.action(); });
    expect(showToast).toHaveBeenCalledWith("追加しました。");
    expect(refreshListPage).toHaveBeenCalledWith(1);
  });

  it("should return valid=true and call PATCH and return VideoItem on handleSave(edit)", async () => {
    const updated = makeVideo({ title: "更新後タイトル" });
    const showToast = vi.fn();
    const refreshCurrentPage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updated,
    }));
    const { result } = renderHook(() => useVideoForm(makeOptions({ showToast, refreshCurrentPage })));
    act(() => { result.current.initEdit(makeVideo()); });
    let saveResult: { action: () => Promise<unknown>; valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("edit", "video-1"); });
    expect(saveResult!.valid).toBe(true);
    let returnValue: unknown;
    await act(async () => { returnValue = await saveResult!.action(); });
    expect(showToast).toHaveBeenCalledWith("更新しました。");
    expect(returnValue).toMatchObject(updated);
  });

  // --- 準正常系 ---

  it("should return valid=false and set youtubeUrl error when url is empty", () => {
    const { result } = renderHook(() => useVideoForm(makeOptions()));
    act(() => { result.current.initAdd(); });
    let saveResult: { valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("add"); });
    expect(saveResult!.valid).toBe(false);
    expect(result.current.formErrors.youtubeUrl).toBeDefined();
  });

  it("should return valid=false and set title error when title is empty", () => {
    const { result } = renderHook(() => useVideoForm(makeOptions()));
    act(() => {
      result.current.initAdd();
      result.current.updateField("youtubeUrl", "https://youtube.com/watch?v=abc");
    });
    let saveResult: { valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("add"); });
    expect(saveResult!.valid).toBe(false);
    expect(result.current.formErrors.title).toBeDefined();
  });

  it("should return valid=false and set tags error when a tag exceeds 10 chars", () => {
    const { result } = renderHook(() => useVideoForm(makeOptions()));
    act(() => {
      result.current.initAdd();
      result.current.updateField("youtubeUrl", "https://youtube.com/watch?v=abc");
      result.current.updateField("title", "タイトル");
      result.current.updateField("tags", ["12345678901"]);
    });
    let saveResult: { valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("add"); });
    expect(saveResult!.valid).toBe(false);
    expect(result.current.formErrors.tags).toBeDefined();
  });

  it("should throw when edit mode has no id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const { result } = renderHook(() => useVideoForm(makeOptions()));
    // 有効なビデオデータで initEdit し、その後 id を除去する
    act(() => {
      result.current.initEdit(makeVideo());
      result.current.updateField("id", undefined);
    });
    let saveResult: { action: () => Promise<unknown>; valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("edit", undefined); });
    expect(saveResult!.valid).toBe(true);
    await expect(saveResult!.action()).rejects.toThrow();
  });

  // --- 異常系 ---

  it("should throw and not call showToast when add API fails", async () => {
    const showToast = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { result } = renderHook(() => useVideoForm(makeOptions({ showToast })));
    act(() => {
      result.current.initAdd();
      result.current.updateField("youtubeUrl", "https://youtube.com/watch?v=abc");
      result.current.updateField("title", "タイトル");
    });
    let saveResult: { action: () => Promise<unknown>; valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("add"); });
    await expect(saveResult!.action()).rejects.toThrow();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("should throw and not call showToast when edit API fails", async () => {
    const showToast = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { result } = renderHook(() => useVideoForm(makeOptions({ showToast })));
    act(() => { result.current.initEdit(makeVideo()); });
    let saveResult: { action: () => Promise<unknown>; valid: boolean } | undefined;
    act(() => { saveResult = result.current.handleSave("edit", "video-1"); });
    await expect(saveResult!.action()).rejects.toThrow();
    expect(showToast).not.toHaveBeenCalled();
  });
});
