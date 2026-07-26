import type { z } from "zod";
import type { videoItemSchema } from "@/lib/schemas/video";

/** 動画 1 件のレスポンス型。Zod スキーマ（schemas/video.ts）を単一ソースに導出。 */
export type VideoItem = z.infer<typeof videoItemSchema>;

/** カテゴリの literal union（プリセット + フォールバック）。 */
export type Category = VideoItem["category"];

/** 一覧の並び順。値は API の `sort` パラメータへ変換して送る（`future` → `published`）。 */
export type SortOption =
  /** 追加日の新しい順（既定） */
  | "newest"
  /** 公開日の新しい順 */
  | "future"
  /** 良かったレベルの高い順 */
  | "rating";

export enum Screen {
  List = "list",
  Detail = "detail",
  Login = "login",
  Add = "add",
  Edit = "edit",
}
