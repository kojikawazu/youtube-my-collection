import type { z } from "zod";
import type { videoItemSchema } from "@/lib/schemas/video";

/** 動画 1 件のレスポンス型。Zod スキーマ（schemas/video.ts）を単一ソースに導出。 */
export type VideoItem = z.infer<typeof videoItemSchema>;

/** カテゴリの literal union（プリセット + フォールバック）。 */
export type Category = VideoItem["category"];

export type SortOption = "newest" | "future" | "rating";

export enum Screen {
  List = "list",
  Detail = "detail",
  Login = "login",
  Add = "add",
  Edit = "edit",
}
