export type Category =
  | "AI"
  | "クラウド"
  | "バックエンド"
  | "フロントエンド"
  | "CI/CD"
  | "Linux"
  | "テック企業"
  | "プログラミング"
  | "未分類";

export type VideoItem = {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  tags: string[];
  category: Category;
  rating: number;
  addedDate: string;
  publishDate: string | null;
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
