import type { Prisma, VideoEntry } from "@prisma/client";

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
/**
 * 一覧 API の並び順を組み立てる。
 * offset ページングは ORDER BY が一意でないと同値行の順序が実行ごとに変わり、
 * ページ間で重複・欠落が起きる。そのため選択された項目の後ろに必ず
 * `createdAt` → `id`（主キー＝一意）のタイブレーカーを付け、順序を一意に確定させる。
 * タイブレーカーも `sortOrder` に揃えるため、order を反転させると結果は完全な逆順になる。
 * `publishDate` は nullable で、Postgres の NULL 位置が向きによって変わる（ASC=末尾 / DESC=先頭）。
 * 「未設定は常に末尾」で固定するため `nulls: "last"` を明示する。
 * @param sort 並び替え項目（`rating` / `published` / それ以外は追加日）
 * @param sortOrder 昇順・降順
 * @returns Prisma の `orderBy` に渡す配列（先頭が主キー、以降がタイブレーカー）
 */
export const buildVideoOrderBy = (
  sort: string,
  sortOrder: Prisma.SortOrder,
): Prisma.VideoEntryOrderByWithRelationInput[] => {
  const tieBreakers: Prisma.VideoEntryOrderByWithRelationInput[] = [{ id: sortOrder }];

  if (sort === "rating") {
    return [{ rating: sortOrder }, { createdAt: sortOrder }, ...tieBreakers];
  }
  if (sort === "published") {
    return [
      { publishDate: { sort: sortOrder, nulls: "last" } },
      { createdAt: sortOrder },
      ...tieBreakers,
    ];
  }
  return [{ createdAt: sortOrder }, ...tieBreakers];
};

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
