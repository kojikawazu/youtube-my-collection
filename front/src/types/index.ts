/** 一覧の並び順。値は API の `sort` パラメータへ変換して送る（`future` → `published`）。 */
export type SortOption =
  /** 追加日の新しい順（既定） */
  | "newest"
  /** 公開日の新しい順 */
  | "future"
  /** 良かったレベルの高い順 */
  | "rating";

/**
 * 画面遷移の状態。SPA 的に 1 度に 1 つの画面だけを表示する。
 * `add` / `edit` はフォーム画面で、キャンセル時の戻り先が異なる（`add` → 一覧、`edit` → 詳細）。
 * 値を反復する処理が無いため、`as const` 配列は設けず union リテラルのみとする。
 */
export type Screen =
  /** 動画一覧（初期画面） */
  | "list"
  /** 動画詳細 */
  | "detail"
  /** 管理者ログイン */
  | "login"
  /** 新規追加フォーム */
  | "add"
  /** 編集フォーム。`selectedVideo` が必ず存在する */
  | "edit";
