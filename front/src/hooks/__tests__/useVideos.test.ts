import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVideos } from "../useVideos";
import type { VideoItem } from "@/lib/types";

const makeVideo = (id: string, overrides: Partial<VideoItem> = {}): VideoItem => ({
  id,
  title: `動画${id}`,
  youtubeUrl: `https://youtube.com/watch?v=${id}`,
  thumbnailUrl: "",
  tags: [],
  category: "プログラミング",
  rating: 3,
  addedDate: "2024-01-01T00:00:00Z",
  publishDate: null,
  goodPoints: "",
  memo: "",
  ...overrides,
});

const mockFetch = (body: VideoItem[], totalCount: number, status = 200) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (key: string) => (key === "x-total-count" ? String(totalCount) : null) },
      json: async () => body,
    })
  );
};

describe("useVideos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // --- 正常系 ---

  it("should fetch videos on mount", async () => {
    const videos = [makeVideo("1"), makeVideo("2"), makeVideo("3"), makeVideo("4")];
    mockFetch(videos, 4);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.videos).toHaveLength(4);
    expect(result.current.totalCount).toBe(4);
  });

  it("should fallback totalCount to array length when x-total-count header is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: async () => [makeVideo("1"), makeVideo("2"), makeVideo("3")],
      })
    );
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalCount).toBe(3);
  });

  it("should re-fetch when sortOption changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "1" },
      json: async () => [makeVideo("1")],
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = fetchMock.mock.calls.length;
    act(() => { result.current.setSortOption("rating"); });
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("should debounce searchQuery by 300ms", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "0" },
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    // 初回フェッチを完了させる
    await act(async () => { await vi.runAllTimersAsync(); });
    const callsBefore = fetchMock.mock.calls.length;
    act(() => { result.current.setSearchQuery("React"); });
    // 299ms では fetch されない
    await act(async () => { vi.advanceTimersByTime(299); });
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    // 300ms でデバウンスが発火し fetch される
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastUrl = fetchMock.mock.calls.at(-1)?.[0] as string;
    expect(lastUrl).toContain("q=React");
  });

  it("should calculate totalPages as ceil(totalCount / 10)", async () => {
    mockFetch([], 21);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPages).toBe(3);
  });

  it("should show at most 5 visible page numbers starting from page 1", async () => {
    mockFetch([], 100);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.visiblePageNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it("should center visible page numbers around currentPage", async () => {
    mockFetch([], 100);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.setCurrentPage(6); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.visiblePageNumbers).toEqual([4, 5, 6, 7, 8]);
  });

  it("should call DELETE then GET on deleteVideo", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => "1" }, json: async () => [makeVideo("1")] })
      .mockResolvedValueOnce({ ok: true, status: 204, headers: { get: () => null }, json: async () => ({}) })
      .mockResolvedValue({ ok: true, headers: { get: () => "0" }, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.deleteVideo("1", "token"); });
    const methods = fetchMock.mock.calls.map((c) => (c[1] as RequestInit | undefined)?.method ?? "GET");
    expect(methods).toContain("DELETE");
  });

  it("should navigate to previous page when last item on final page is deleted", async () => {
    const videos10 = Array.from({ length: 10 }, (_, i) => makeVideo(String(i + 1)));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => "11" }, json: async () => videos10 })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => "10" }, json: async () => videos10 })
      .mockResolvedValueOnce({ ok: true, status: 204, headers: { get: () => null }, json: async () => ({}) })
      .mockResolvedValue({ ok: true, headers: { get: () => "10" }, json: async () => videos10 });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.setCurrentPage(2); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.deleteVideo("11", "token"); });
    expect(result.current.currentPage).toBe(1);
  });

  // --- 準正常系 ---

  it("should set loadError when API returns 500", async () => {
    mockFetch([], 0, 500);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadError).toBe("データの取得に失敗しました。");
  });

  it("should reset currentPage to 1 when filter changes on page > 1", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "21" },
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.setCurrentPage(3); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.setSortOption("rating"); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentPage).toBe(1);
  });

  // --- 異常系 ---

  it("should set loadError when fetch throws a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadError).toBe("データの取得に失敗しました。");
  });

  it("should throw when deleteVideo API returns error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => "1" }, json: async () => [makeVideo("1")] })
      .mockResolvedValueOnce({ ok: false, status: 500, headers: { get: () => null }, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.deleteVideo("1", "token")).rejects.toThrow();
  });
});
