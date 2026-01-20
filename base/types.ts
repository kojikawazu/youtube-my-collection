
export type Category = '音楽' | 'プログラミング' | 'デザイン' | '料理' | 'ライフハック' | 'ゲーム';

export interface VideoItem {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  tags: string[];
  category: Category;
  rating: number; // 1-5
  addedDate: string; // ISO format
  publishDate: string; // ISO format
  goodPoints: string; // Markdown
  memo: string; // Markdown
}

export type SortOption = 'newest' | 'future' | 'rating';

export enum Screen {
  List = 'list',
  Detail = 'detail',
  Login = 'login',
  Add = 'add',
  Edit = 'edit'
}
