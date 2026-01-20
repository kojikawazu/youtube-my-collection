# API設計

## 前提
- Next.js Route Handlers (`app/api/*`)
- 公開はGETのみ
- 管理操作はSupabase Authで管理者チェック必須

## エンドポイント一覧

### 公開
- GET /api/videos
  - 用途: 一覧取得
  - クエリ:
    - sort: `added` | `published` | `rating`
    - order: `desc` (default) | `asc`
    - tag: 任意(一致)
    - category: 任意(一致)
    - limit: 任意
    - offset: 任意

- GET /api/videos/:id
  - 用途: 詳細取得

### 管理者のみ
- POST /api/videos
  - 用途: 新規作成
  - body:
    - youtube_url (required)
    - tags
    - category
    - good_points
    - memo
    - rating
  - 処理:
    - YouTube URLからタイトル/サムネを取得して保存

- PATCH /api/videos/:id
  - 用途: 編集
  - body: 更新対象のみ
  - 処理:
    - youtube_url更新時はタイトル/サムネを再取得

- DELETE /api/videos/:id
  - 用途: 削除

## レスポンス(共通)
- video:
  - id
  - youtube_url
  - title
  - thumbnail_url
  - tags
  - category
  - good_points
  - memo
  - rating
  - publish_date (nullable)
  - created_at
  - updated_at
