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
  - 並び順（**offset ページングのため一意に確定させる**）:

    | sort | ORDER BY |
    |---|---|
    | `rating` | `rating` → `createdAt` → `id` |
    | `published` | `publishDate`（**NULL は常に末尾**） → `createdAt` → `id` |
    | `added`（既定・未知の値） | `createdAt` → `id` |

    - **タイブレーカー（`createdAt` / `id`）は必ず付ける。** ORDER BY が一意でないと、同値行の順序が実行ごとに変わり、`limit`/`offset` のページ間で**重複・欠落**が起きる。`id` は主キーのため、これを最後に置くことで順序が一意に確定する。
    - タイブレーカーも `order` と同じ方向に並べる。したがって **`order` を反転させると結果は完全な逆順**になる。
    - `publishDate` は未設定（`null`）を取り得る。Postgres の既定は `ASC` で末尾・`DESC` で先頭と向きによって変わるため、**`nulls: "last"` を明示して「未設定は常に末尾」で固定**する。
    - 実装は `front/src/lib/videos.ts` の `buildVideoOrderBy`（Route Handler では組み立てない）。

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
- **不正な JSON ボディ（壊れた JSON・空ボディ）→ `400 { error: "Invalid JSON body" }`**
  - クライアントが直せる入力エラーであり、サーバー障害（5xx）ではない。4xx / 5xx を混ぜると監視のアラートが誤爆し、API クライアントも「リトライすべき障害」と誤判断する
  - 実装は `front/src/lib/request.ts` の `readJsonBody`。**JSON 解析だけを狭く捕捉**する（広い `try/catch` の中で `request.json()` を呼ぶと DB 例外と区別できず 500 に丸まる）
  - 内部例外（DB エラー等）は従来どおり 500
  - `null` や `{}` のような**妥当な JSON** は 400 にしない。PATCH では「更新対象なし」として 200（no-op）
  - **DELETE のみボディが任意**のため例外。ID はパスから解決できるので、解析できないボディは 400 にせず「ボディ無し」として扱う

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
    - rating（省略可。未送信なら **既定値 3** で保存。送信時は 1〜5）
    - publishDate
  - 処理:
    - タイトルはクライアントから送信された値を保存
    - サムネURLはクライアント側でYouTube URLから生成して送信
    - **必須は `youtubeUrl` と `title` のみ**。`rating` の既定値適用は Zod スキーマ（`videoInputSchema` の `.default`）が単一ソース
    - PATCH には既定値を波及させない（未送信の `rating` で既存の評価を上書きしないため、共通の土台スキーマには `.default` を置かない）

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
| 真実のソース | `front/src/schemas/video.ts`（Zod）。検証・型・OpenAPI を兼ねる |
| 生成 | `front/src/lib/openapi.ts`（`@asteasolutions/zod-to-openapi`） |
| OpenAPI JSON | `GET /api/openapi.json`（OpenAPI 3.0）。**管理者限定**: `requireAdmin` で保護し、未認証は 401・非管理者は 403 |
| Swagger UI | `GET /docs`（CDN の Swagger UI を SRI 付きで読み込む）。**管理者限定**: クライアントガードで管理者セッションが無ければログイン誘導を表示。Swagger UI は `requestInterceptor` で Bearer トークンを注入 |

- バリデーションの単一ソース化により、入力スキーマ（`VideoInput` / `VideoUpdate`）・レスポンス（`VideoItem`）が上記エンドポイント定義と構造的に一致する。
- 設計の経緯・将来の TypeSpec 移行方針は [`notes/openapi-zod-plan.md`](./notes/openapi-zod-plan.md) を参照。
