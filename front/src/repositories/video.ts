// 動画 API（/api/videos）へのアクセスを閉じ込める層。
// `fetch` はこのレイヤにだけ書く（.claude/rules/frontend.md「通信は repositories/ に閉じる」）。
// API 契約の知識（クエリパラメータ名・並び順の呼び名・総件数ヘッダ）もここに閉じ、
// 呼び出し側のフックは「ページ・検索語・並び順」という画面の言葉だけを扱う。

import type { VideoItem } from "@/schemas/video";
import type { SortOption } from "@/types";

/** 一覧取得のパラメータ。画面の状態をそのまま渡す（API の表現への変換は本モジュールが行う）。 */
export type FetchVideosParams = {
  /** 取得するページ番号（1 始まり） */
  page: number;
  /** 1 ページあたりの件数 */
  pageSize: number;
  /** 画面上の並び順。API の `sort` 値へは本モジュールで変換する */
  sortOption: SortOption;
  /** 検索語。空文字なら検索条件を付けない */
  searchQuery: string;
  /** true で CDN キャッシュを回避する（CRUD 直後の再取得用） */
  bustCache: boolean;
  /** 進行中リクエストの中止用シグナル */
  signal: AbortSignal;
};

/** 一覧取得の結果。 */
export type FetchVideosResult = {
  /** 取得できた動画（該当なしは空配列。「未取得」ではない） */
  videos: VideoItem[];
  /** 検索条件に一致する総件数（ページング前）。ヘッダが不正なら取得件数で代替する */
  totalCount: number;
};

/** 動画の作成・更新で送るリクエストボディ。 */
export type VideoPayload = {
  /** YouTube の動画 URL */
  youtubeUrl: string | undefined;
  /** 動画タイトル */
  title: string | undefined;
  /** サムネイル URL。YouTube URL から導出する */
  thumbnailUrl: string;
  /** タグ */
  tags: string[];
  /** カテゴリ。未選択は「未分類」 */
  category: string;
  /** 良かったレベル（1〜5） */
  rating: number;
  /** 良かったポイント */
  goodPoints: string;
  /** メモ */
  memo: string;
  /** 公開日。null は「未公開」を表す */
  publishDate: string | null;
};

/**
 * 管理者操作の Authorization ヘッダを組み立てる。未ログイン（null）なら付けない。
 * @param accessToken Supabase のアクセストークン
 * @returns fetch の headers に展開できるオブジェクト
 */
const authHeaders = (accessToken: string | null): Record<string, string> =>
  accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

/**
 * 動画一覧を取得する。
 *
 * 画面の並び順を API の `sort` 値へ変換し（`future` → `published`）、総件数は
 * `x-total-count` ヘッダから読む。ヘッダが欠落・不正な場合は取得件数で代替する
 * （0 件と「ヘッダが無い」を区別できないと、ページャが消える方向に倒れるため）。
 * @param params 取得条件
 * @returns 動画配列と総件数
 * @throws {Error} レスポンスが 2xx でなかった場合。中止時は fetch が AbortError を投げる
 */
export const fetchVideos = async (params: FetchVideosParams): Promise<FetchVideosResult> => {
  const { page, pageSize, sortOption, searchQuery, bustCache, signal } = params;

  const query = new URLSearchParams({
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
    order: "desc",
    sort: sortOption === "future" ? "published" : sortOption === "rating" ? "rating" : "added",
  });
  if (searchQuery) {
    query.set("q", searchQuery);
  }
  if (bustCache) {
    query.set("_t", String(Date.now()));
  }

  const response = await fetch(`/api/videos?${query.toString()}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load videos");
  }

  const videos = (await response.json()) as VideoItem[];
  const totalCountHeader = response.headers.get("x-total-count");
  const parsedTotalCount = totalCountHeader ? Number(totalCountHeader) : NaN;

  return {
    videos,
    totalCount:
      Number.isFinite(parsedTotalCount) && parsedTotalCount >= 0 ? parsedTotalCount : videos.length,
  };
};

/**
 * 動画を新規作成する（管理者操作）。
 * @param payload 送信するリクエストボディ
 * @param accessToken 認可に使う Bearer トークン（未ログインは null）
 * @throws {Error} レスポンスが 2xx でなかった場合
 */
export const createVideo = async (
  payload: VideoPayload,
  accessToken: string | null,
): Promise<void> => {
  const response = await fetch("/api/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create video");
  }

  // 作成結果は画面で使わない（一覧を再取得して反映する）。ボディは読み捨てる。
  await response.json();
};

/**
 * 動画を更新する（管理者操作）。
 * @param id 更新対象の動画 ID
 * @param payload 送信するリクエストボディ
 * @param accessToken 認可に使う Bearer トークン（未ログインは null）
 * @returns 更新後の動画
 * @throws {Error} レスポンスが 2xx でなかった場合
 */
export const updateVideo = async (
  id: string,
  payload: VideoPayload,
  accessToken: string | null,
): Promise<VideoItem> => {
  const response = await fetch(`/api/videos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify({ id, ...payload }),
  });

  if (!response.ok) {
    throw new Error("Failed to update video");
  }

  return (await response.json()) as VideoItem;
};

/**
 * 動画を削除する（管理者操作）。
 * @param id 削除対象の動画 ID
 * @param accessToken 認可に使う Bearer トークン（未ログインは null）
 * @throws {Error} レスポンスが 2xx でなかった場合
 */
export const deleteVideo = async (id: string, accessToken: string | null): Promise<void> => {
  const response = await fetch(`/api/videos/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error("Failed to delete");
  }
};
