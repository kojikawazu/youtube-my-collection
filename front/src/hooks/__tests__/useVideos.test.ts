import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVideos } from "../useVideos";
import type { VideoItem } from "@/types";

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
    }),
  );
};

/** テスト側が完了タイミングを制御できる 1 リクエスト分のハンドル。 */
type PendingRequest = {
  /** 成功として完了させる。 */
  resolve: (payload: { body: VideoItem[]; totalCount: number }) => void;
  /** 失敗として完了させる。 */
  reject: (error: unknown) => void;
};

/**
 * fetch を「呼ばれるたびに未解決の Promise を返す」形に差し替え、完了順をテストから操作できるようにする。
 * レスポンスの到着順を意図的に逆転させて競合状態を再現するために使う。
 * @returns 呼び出し順に積まれるリクエストハンドルの配列
 */
const controlledFetch = (): PendingRequest[] => {
  const pending: PendingRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise((resolve, reject) => {
          pending.push({
            resolve: ({ body, totalCount }) =>
              resolve({
                ok: true,
                status: 200,
                headers: {
                  get: (key: string) => (key === "x-total-count" ? String(totalCount) : null),
                },
                json: async () => body,
              }),
            reject,
          });
        }),
    ),
  );
  return pending;
};

/** 保留中の Promise チェーンを進め、state 更新を React に反映させる。 */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
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
      }),
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
    act(() => {
      result.current.setSortOption("rating");
    });
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
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    const callsBefore = fetchMock.mock.calls.length;
    act(() => {
      result.current.setSearchQuery("React");
    });
    // 299ms では fetch されない
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    // 300ms でデバウンスが発火し fetch される
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
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
    act(() => {
      result.current.setCurrentPage(6);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.visiblePageNumbers).toEqual([4, 5, 6, 7, 8]);
  });

  it("should call DELETE then GET on deleteVideo", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "1" },
        json: async () => [makeVideo("1")],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => null },
        json: async () => ({}),
      })
      .mockResolvedValue({ ok: true, headers: { get: () => "0" }, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.deleteVideo("1", "token");
    });
    const methods = fetchMock.mock.calls.map(
      (c) => (c[1] as RequestInit | undefined)?.method ?? "GET",
    );
    expect(methods).toContain("DELETE");
  });

  it("should navigate to previous page when last item on final page is deleted", async () => {
    const videos10 = Array.from({ length: 10 }, (_, i) => makeVideo(String(i + 1)));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => "11" }, json: async () => videos10 })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => "11" }, json: async () => videos10 })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => null },
        json: async () => ({}),
      })
      .mockResolvedValue({ ok: true, headers: { get: () => "11" }, json: async () => videos10 });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setCurrentPage(2);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.deleteVideo("11", "token");
    });
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
    act(() => {
      result.current.setCurrentPage(3);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.setSortOption("rating");
    });
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

  // --- 競合状態（レスポンスの到着順が逆転するケース） ---

  it("should keep the newest result when an older request resolves later", async () => {
    const pending = controlledFetch();
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(pending).toHaveLength(1));

    // 1 件目が未完了のまま 2 件目のリクエストを開始する。
    act(() => {
      result.current.setCurrentPage(2);
    });
    await waitFor(() => expect(pending).toHaveLength(2));

    // 新しい方（2 件目）を先に完了させる。
    act(() => {
      pending[1].resolve({ body: [makeVideo("new")], totalCount: 20 });
    });
    await waitFor(() => expect(result.current.videos).toHaveLength(1));
    expect(result.current.videos[0].id).toBe("new");

    // 古い方（1 件目）が後から完了しても、最新の結果を上書きしない。
    act(() => {
      pending[0].resolve({ body: [makeVideo("old-a"), makeVideo("old-b")], totalCount: 99 });
    });
    await flush();

    expect(result.current.videos.map((v) => v.id)).toEqual(["new"]);
    expect(result.current.totalCount).toBe(20);
  });

  it("should keep isLoading true when only the older request has finished", async () => {
    const pending = controlledFetch();
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(pending).toHaveLength(1));

    act(() => {
      result.current.setCurrentPage(2);
    });
    await waitFor(() => expect(pending).toHaveLength(2));

    // 古い方だけが完了した状態。最新リクエストは進行中なのでローディングは解除されない。
    act(() => {
      pending[0].resolve({ body: [makeVideo("old")], totalCount: 99 });
    });
    await flush();
    expect(result.current.isLoading).toBe(true);

    act(() => {
      pending[1].resolve({ body: [makeVideo("new")], totalCount: 20 });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.videos.map((v) => v.id)).toEqual(["new"]);
  });

  it("should not surface an error when an older request is aborted", async () => {
    const pending = controlledFetch();
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(pending).toHaveLength(1));

    act(() => {
      result.current.setCurrentPage(2);
    });
    await waitFor(() => expect(pending).toHaveLength(2));

    // 中止された古いリクエストは AbortError で失敗する。利用者向けエラーにはしない。
    act(() => {
      pending[0].reject(new DOMException("The operation was aborted.", "AbortError"));
    });
    await flush();
    expect(result.current.loadError).toBeNull();

    act(() => {
      pending[1].resolve({ body: [makeVideo("new")], totalCount: 1 });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadError).toBeNull();
    expect(result.current.videos.map((v) => v.id)).toEqual(["new"]);
  });

  it("should abort the in-flight request when a newer one starts", async () => {
    const pending = controlledFetch();
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(pending).toHaveLength(1));

    const firstSignal = (vi.mocked(fetch).mock.calls[0][1] as RequestInit).signal as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      result.current.setCurrentPage(2);
    });
    await waitFor(() => expect(pending).toHaveLength(2));

    expect(firstSignal.aborted).toBe(true);
  });

  it("should abort the in-flight request on unmount", async () => {
    const pending = controlledFetch();
    const { unmount } = renderHook(() => useVideos());
    await waitFor(() => expect(pending).toHaveLength(1));

    const signal = (vi.mocked(fetch).mock.calls[0][1] as RequestInit).signal as AbortSignal;
    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("should throw when deleteVideo API returns error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "1" },
        json: async () => [makeVideo("1")],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => null },
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.deleteVideo("1", "token")).rejects.toThrow();
  });
});
