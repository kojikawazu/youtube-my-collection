# API設計

## 前提
- Next.js Route Handlers (`app/api/*`)
- 公開はGETのみ
- 管理操作はSupabase Authで管理者チェック必須
- 管理操作は `Authorization: Bearer <token>` が必要

## エンドポイント一覧

### 公開
- GET /api/videos
  - 用途: 一覧取得
  - クエリ:
    - sort: `added` | `published` | `rating`
    - order: `desc` (default) | `asc`
    - q: 任意（検索文字列）
      - title: 部分一致（大文字小文字を区別しない）
      - tags: 一致（`has`）
    - tag: 任意(一致)
    - category: 任意(一致)
    - limit: 任意（default: `10`, min: `1`, max: `100`）
    - offset: 任意（default: `0`, min: `0`）
  - レスポンスヘッダー:
    - `x-total-count`: 検索条件に一致した総件数
    - `x-limit`: 実際に適用した `limit`
    - `x-offset`: 実際に適用した `offset`
  - 備考:
    - レスポンス本文は後方互換のため `VideoItem[]` を維持
    - `x-total-count` は同一条件の件数クエリで算出する

- GET /api/videos/:id
  - 用途: 詳細取得

### 管理者のみ
- POST /api/videos
  - 用途: 新規作成
  - body:
    - youtubeUrl (required)
    - title
    - thumbnailUrl
    - tags
    - category
    - goodPoints
    - memo
    - rating
    - publishDate
  - 処理:
    - YouTube URLからタイトル/サムネを取得して保存

- PATCH /api/videos/:id
  - 用途: 編集
  - body: 更新対象のみ
  - 処理:
    - youtubeUrl更新時はタイトル/サムネを再取得

- DELETE /api/videos/:id
  - 用途: 削除

## レスポンス(共通)
- video:
  - id
  - youtubeUrl
  - title
  - thumbnailUrl
  - tags
  - category
  - goodPoints
  - memo
  - rating
  - publishDate (nullable)
  - addedDate
