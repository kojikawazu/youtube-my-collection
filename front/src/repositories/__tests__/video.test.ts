import { describe, it, expect, vi, afterEach } from "vitest";
import { createVideo, deleteVideo, fetchVideos, updateVideo } from "../video";
import type { VideoPayload } from "../video";

/**
 * fetch の戻り値を組み立てる。`x-total-count` は Headers 実体で持たせ、
 * 「ヘッダが無い」ケース（get が null を返す）を実物と同じ形で再現する。
 * @param body json() が返すボディ
 * @param totalCount x-total-count ヘッダの値。undefined ならヘッダ自体を付けない
 * @param ok レスポンスが 2xx かどうか
 * @returns fetch のモック応答
 */
const makeResponse = (body: unknown, totalCount?: string, ok = true): Response => {
  const headers = new Headers();
  if (totalCount !== undefined) {
    headers.set("x-total-count", totalCount);
  }
  return { ok, headers, json: async () => body } as unknown as Response;
};

/** 一覧取得の既定パラメータ。各テストで必要な項目だけ上書きする。 */
const baseParams = {
  page: 1,
  pageSize: 10,
  sortOption: "newest" as const,
  searchQuery: "",
  bustCache: false,
  signal: new AbortController().signal,
};

/**
 * 直近の fetch 呼び出しで組み立てられたクエリ文字列を取り出す。
 * @param fetchMock stub した fetch
 * @returns URLSearchParams
 */
const queryOf = (fetchMock: ReturnType<typeof vi.fn>): URLSearchParams => {
  const url = fetchMock.mock.calls[0]?.[0] as string;
  return new URLSearchParams(url.slice(url.indexOf("?") + 1));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchVideos", () => {
  // --- 正常系 ---

  it("x-total-count ヘッダの値を総件数として返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([{ id: "a" }], "42"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchVideos(baseParams);

    expect(result.totalCount).toBe(42);
    expect(result.videos).toEqual([{ id: "a" }]);
  });

  it("画面の並び順を API の sort 値へ変換する（future → published）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([], "0"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchVideos({ ...baseParams, sortOption: "future" });

    expect(queryOf(fetchMock).get("sort")).toBe("published");
  });

  it("ページ番号を offset へ変換する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([], "0"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchVideos({ ...baseParams, page: 3, pageSize: 10 });

    expect(queryOf(fetchMock).get("offset")).toBe("20");
    expect(queryOf(fetchMock).get("limit")).toBe("10");
  });

  // --- 準正常系（ヘッダが期待どおり返らない） ---

  it("x-total-count が欠落していれば取得件数で代替する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([{ id: "a" }, { id: "b" }]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchVideos(baseParams);

    expect(result.totalCount).toBe(2);
  });

  it("x-total-count が数値でなければ取得件数で代替する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([{ id: "a" }], "not-a-number"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchVideos(baseParams);

    expect(result.totalCount).toBe(1);
  });

  it("x-total-count が負値なら取得件数で代替する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([{ id: "a" }], "-5"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchVideos(baseParams);

    expect(result.totalCount).toBe(1);
  });

  it("検索語が空文字なら q を付けない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([], "0"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchVideos({ ...baseParams, searchQuery: "" });

    expect(queryOf(fetchMock).has("q")).toBe(false);
  });

  it("bustCache 指定時のみキャッシュ回避パラメータを付ける", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([], "0"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchVideos({ ...baseParams, bustCache: false });
    expect(queryOf(fetchMock).has("_t")).toBe(false);

    fetchMock.mockClear();
    await fetchVideos({ ...baseParams, bustCache: true });
    expect(queryOf(fetchMock).has("_t")).toBe(true);
  });

  // --- 異常系 ---

  it("2xx 以外なら throw する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse([], undefined, false)));

    await expect(fetchVideos(baseParams)).rejects.toThrow("Failed to load videos");
  });
});

/** 作成・更新で送る最小のボディ。 */
const payload: VideoPayload = {
  youtubeUrl: "https://youtube.com/watch?v=x",
  title: "t",
  thumbnailUrl: "https://img/x.jpg",
  tags: [],
  category: "未分類",
  rating: 3,
  goodPoints: "",
  memo: "",
  publishDate: null,
};

describe("createVideo", () => {
  it("POST で Bearer トークンを付けて送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ id: "a" }));
    vi.stubGlobal("fetch", fetchMock);

    await createVideo(payload, "token-1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/videos");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-1" });
  });

  it("未ログイン（null）なら Authorization を付けない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ id: "a" }));
    vi.stubGlobal("fetch", fetchMock);

    await createVideo(payload, null);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("2xx 以外なら throw する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse({}, undefined, false)));

    await expect(createVideo(payload, "token-1")).rejects.toThrow("Failed to create video");
  });
});

describe("updateVideo", () => {
  it("PATCH のボディに対象 ID を含めて送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ id: "v1", title: "t" }));
    vi.stubGlobal("fetch", fetchMock);

    const updated = await updateVideo("v1", payload, "token-1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/videos/v1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toMatchObject({ id: "v1", title: "t" });
    expect(updated).toEqual({ id: "v1", title: "t" });
  });

  it("2xx 以外なら throw する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse({}, undefined, false)));

    await expect(updateVideo("v1", payload, "token-1")).rejects.toThrow("Failed to update video");
  });
});

describe("deleteVideo", () => {
  it("DELETE で Bearer トークンを付けて送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await deleteVideo("v1", "token-1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/videos/v1");
    expect(init.method).toBe("DELETE");
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-1" });
  });

  it("2xx 以外なら throw する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse({}, undefined, false)));

    await expect(deleteVideo("v1", "token-1")).rejects.toThrow("Failed to delete");
  });
});
