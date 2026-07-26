import type { VideoEntry } from "@prisma/client";

/**
 * `toVideoItem` が読む DB 行のフィールド。
 * Prisma の `VideoEntry` から必要な列だけを取り出すことで、スキーマ変更が型エラーとして表面化する。
 * `updatedAt` は API に出さないため含めない。
 */
type VideoEntryRow = Pick<
  VideoEntry,
  | "id"
  | "youtubeUrl"
  | "title"
  | "thumbnailUrl"
  | "tags"
  | "category"
  | "goodPoints"
  | "memo"
  | "rating"
  | "publishDate"
  | "createdAt"
>;

/**
 * Prisma の VideoEntry を API レスポンス形（日付を ISO 文字列化、`createdAt`→`addedDate`）へ変換する。
 * 一覧・詳細・作成・更新のすべてのエンドポイントがこの 1 箇所を通ることで、レスポンス契約のズレを防ぐ。
 * 返す列を明示列挙しているため、スキーマに列が増えても自動的に公開されることはない。
 * @param video 変換元の DB 行
 * @returns API レスポンス形の動画オブジェクト
 */
export const toVideoItem = (video: VideoEntryRow) => ({
  id: video.id,
  youtubeUrl: video.youtubeUrl,
  title: video.title,
  thumbnailUrl: video.thumbnailUrl,
  tags: video.tags,
  category: video.category,
  goodPoints: video.goodPoints,
  memo: video.memo,
  rating: video.rating,
  publishDate: video.publishDate ? video.publishDate.toISOString() : null,
  addedDate: video.createdAt.toISOString(),
});
