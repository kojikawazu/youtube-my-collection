# API 仕様書

エンドポイント・リクエスト/レスポンス形式・認証・エラーハンドリングを定義する。データモデルは [`05-data-specification.md`](./05-data-specification.md)、認証/認可方針は [`06-security-specification.md`](./06-security-specification.md) を参照。

## 目次

- [前提](#前提)
- [エンドポイント一覧](#エンドポイント一覧)
  - [公開](#公開)
  - [管理者のみ](#管理者のみ)
  - [認証](#認証)
- [レスポンス(共通)](#レスポンス共通)
- [OpenAPI / Swagger UI](#openapi--swagger-ui)

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
- 認証/認可エラー（`requireAdmin`）:
  - `Authorization` ヘッダー欠如・空トークン → `401 { error: "Unauthorized" }`
  - トークン無効・`ADMIN_EMAIL` 不一致 → `403 { error: "Forbidden" }`
- バリデーションエラー → `400 { errors }`

- POST /api/videos
  - 用途: 新規作成
  - body:
    - youtubeUrl (required)
    - title (required)
    - thumbnailUrl
    - tags
    - category
    - goodPoints
    - memo
    - rating
    - publishDate
  - 処理:
    - タイトルはクライアントから送信された値を保存
    - サムネURLはクライアント側でYouTube URLから生成して送信

- PATCH /api/videos/:id
  - 用途: 編集
  - body: 更新対象のみ
  - 処理:
    - クライアントから送信された値で更新

- DELETE /api/videos/:id
  - 用途: 削除

### 認証
- GET /api/auth/admin
  - 用途: 管理者判定
  - ヘッダー: `Authorization: Bearer <token>` が必要
  - レスポンス: `{ isAdmin: boolean }`
  - 処理:
    - Bearerトークンで Supabase Auth の `getUser` を呼び出し
    - メールアドレスが `ADMIN_EMAIL` と一致すれば `200 { isAdmin: true }`
    - 有効なトークンだがメール不一致の場合は `200 { isAdmin: false }`（認可の結果であり認証は成功）
    - トークン欠如・無効、または `getUser` 失敗時は `401 { isAdmin: false }`

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

## OpenAPI / Swagger UI

本仕様書を正準としつつ、実装と同期する「動く版」として OpenAPI ドキュメントを **Zod スキーマから自動生成**する。

| 項目 | 内容 |
|------|------|
| 真実のソース | `front/src/lib/schemas/video.ts`（Zod）。検証・型・OpenAPI を兼ねる |
| 生成 | `front/src/lib/openapi.ts`（`@asteasolutions/zod-to-openapi`） |
| OpenAPI JSON | `GET /api/openapi.json`（OpenAPI 3.0）。**管理者限定**: `requireAdmin` で保護し、未認証は 401・非管理者は 403 |
| Swagger UI | `GET /docs`（CDN の Swagger UI を SRI 付きで読み込む）。**管理者限定**: クライアントガードで管理者セッションが無ければログイン誘導を表示。Swagger UI は `requestInterceptor` で Bearer トークンを注入 |

- バリデーションの単一ソース化により、入力スキーマ（`VideoInput` / `VideoUpdate`）・レスポンス（`VideoItem`）が上記エンドポイント定義と構造的に一致する。
- 設計の経緯・将来の TypeSpec 移行方針は [`notes/openapi-zod-plan.md`](./notes/openapi-zod-plan.md) を参照。
