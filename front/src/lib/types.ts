export type Category =
  | "音楽"
  | "プログラミング"
  | "デザイン"
  | "料理"
  | "ライフハック"
  | "ゲーム";

export type VideoItem = {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  tags: string[];
  category: Category;
  rating: number;
  addedDate: string;
  publishDate: string;
  goodPoints: string;
  memo: string;
};

export type SortOption = "newest" | "future" | "rating";

export enum Screen {
  List = "list",
  Detail = "detail",
  Login = "login",
  Add = "add",
  Edit = "edit",
}
