# テスト設計: validateVideoInput（バリデーション純粋関数）

## 対象

- 対象機能: フォーム入力バリデーション
- 対象ファイル: `front/src/lib/validation.ts`
- スタック: Next.js / TypeScript
- テストファイル（予定）: `front/src/lib/__tests__/validation.test.ts`

## テストケース一覧

### 正常系

| # | テストケース | 入力 | 期待結果 | テスト種別 | 優先度 |
|---|---|---|---|---|---|
| N-1 | 全フィールド正常値でエラーなし | youtubeUrl/title/tags/category/goodPoints/memo/rating すべて有効値 | `errors = {}` | Unit | High |
| N-2 | category が空文字 → "未分類" にフォールバック | `category: ""` | `data.category === "未分類"` | Unit | High |
| N-3 | tags がカンマ区切り文字列 → 配列に正規化 | `tags: "React, TypeScript"` | `data.tags = ["React", "TypeScript"]` | Unit | Medium |
| N-4 | rating が小数 → 四捨五入 | `rating: 3.7` | `data.rating === 4` | Unit | Medium |
| N-5 | publishDate が null → そのまま null | `publishDate: null` | `data.publishDate === null` | Unit | Low |
| N-6 | partial モードで未指定フィールドはスキップ | `partial: true`, youtubeUrl のみ指定 | title 等のエラーなし | Unit | High |

### 準正常系

| # | テストケース | 入力 | 期待結果 | テスト種別 | 優先度 |
|---|---|---|---|---|---|
| S-1 | youtubeUrl が空 → 必須エラー | `youtubeUrl: ""` | `errors.youtubeUrl = "YouTube URLは必須です。"` | Unit | High |
| S-2 | title が空 → 必須エラー | `title: ""` | `errors.title = "タイトルは必須です。"` | Unit | High |
| S-3 | タグが 11 文字 → 長さエラー | `tags: ["12345678901"]` | `errors.tags` がセットされる | Unit | High |
| S-4 | タグが 10 文字 → エラーなし（境界値） | `tags: ["1234567890"]` | `errors.tags` なし | Unit | High |
| S-5 | category が 11 文字 → 長さエラー | `category: "12345678901"` | `errors.category` がセットされる | Unit | High |
| S-6 | goodPoints が 2001 文字 → 長さエラー | `goodPoints: "a".repeat(2001)` | `errors.goodPoints` がセットされる | Unit | High |
| S-7 | memo が 2001 文字 → 長さエラー | `memo: "a".repeat(2001)` | `errors.memo` がセットされる | Unit | High |
| S-8 | rating が 0 → 範囲エラー | `rating: 0` | `errors.rating` がセットされる | Unit | High |
| S-9 | rating が 6 → 範囲エラー | `rating: 6` | `errors.rating` がセットされる | Unit | High |
| S-10 | rating が NaN → 範囲エラー | `rating: NaN` | `errors.rating` がセットされる | Unit | Medium |
| S-11 | youtubeUrl が空白のみ → 必須エラー（トリム後空） | `youtubeUrl: "   "` | `errors.youtubeUrl` がセットされる | Unit | Medium |
| S-12 | tags 配列内に空文字 → フィルタされて errors なし | `tags: ["", "React", ""]` | `data.tags = ["React"]` | Unit | Medium |

### 異常系

| # | テストケース | 入力 | 期待結果 | テスト種別 | 優先度 |
|---|---|---|---|---|---|
| A-1 | tags が null → 空配列として扱われエラーなし | `tags: null` | `data.tags = []` | Unit | Low |
| A-2 | rating が文字列数値 → 数値変換して検証 | `rating: "3"` | `data.rating === 3` | Unit | Low |

## テスト構成

### ユニットテスト
- 対象ファイル: `front/src/lib/validation.ts`
- テストファイル: `front/src/lib/__tests__/validation.test.ts`
- モック対象: なし（純粋関数のため外部依存ゼロ）

## モック方針

- モック: **不要**（外部 I/O なし）
