/**
 * 動画フォームの項目別バリデーションエラー。
 * キーが存在しない項目はエラーなしを意味する（空文字は入れない）。
 * 値は画面にそのまま表示する日本語メッセージ。
 */
export type ValidationErrors = {
  /** YouTube URL の形式エラー */
  youtubeUrl?: string;
  /** タイトルの必須・文字数エラー */
  title?: string;
  /** タグの件数・1 件あたりの文字数エラー */
  tags?: string;
  /** カテゴリの文字数エラー */
  category?: string;
  /** 良かった点の文字数エラー */
  goodPoints?: string;
  /** メモの文字数エラー */
  memo?: string;
  /** 良かったレベルの範囲エラー（1〜5 以外） */
  rating?: string;
};
