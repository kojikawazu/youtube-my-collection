# Go + Echo バックエンド API 移行計画

## 背景

Supabase DB のテーブルが 6 ドメイン・19 テーブルに増加し、各フロントが個別に Prisma + Next.js Route Handlers で DB アクセスする構成の管理コストが高くなっている。
Go + Echo の共通バックエンド API に集約し、スキーマ変更時の影響をバックエンド 1 箇所に限定する。

---

## 現在の Supabase テーブル一覧

| ドメイン | テーブル | 行数 | FK 関係 |
|----------|---------|------|---------|
| VideoEntry | `VideoEntry` | 31 | なし |
| Report | `Report`, `ReportTag`, `ReportTagMapping` | 210 / 7 / 95 | Report ← ReportTagMapping → ReportTag |
| Exercise | `ExerciseRecord`, `ExerciseWorkout`, `ExerciseCardio`, `ExerciseMaster`, `ExerciseProfile` | 7 / 22 / 7 / 1 / 1 | Record ← Workout, Record ← Cardio |
| BookRecord | `BookRecordBooks`, `BookRecordProgressLogs`, `BookRecordReflections` | 1 / 1 / 1 | Books ← ProgressLogs, Books ← Reflections |
| Blog | `blogs`, `blog_likes`, `blog_comments`, `blog_users` | 38 / 7 / 1 / 2 | blogs ← likes, comments; blog_users ← blogs |
| GitHub | `github_repositories`, `github_hidden_paths` | 2 / 0 | repositories ← hidden_paths |

※ `_prisma_migrations` は Prisma 管理テーブルのため省略。

---

## 現在のアーキテクチャ

```
┌──────────── 同一オリジン（Vercel）────────────┐
│                                                │
│  ブラウザ (React)       Next.js Server          │
│  ┌────────────┐       ┌──────────────────┐    │
│  │supabase SDK│─OAuth→│/auth/callback     │    │
│  │(localStorage│       │exchangeCode...   │    │
│  │ にセッション)│←──────│                  │    │
│  │            │       └──────────────────┘    │
│  │            │Bearer  ┌──────────────────┐    │
│  │ hooks      │──────→│/api/auth/admin    │──→ Supabase Auth API
│  │            │       │/api/videos        │──→ Supabase Postgres
│  │            │       │  (Prisma)         │    │
│  └────────────┘       └──────────────────┘    │
└────────────────────────────────────────────────┘
```

- 全通信が同一オリジンのため CORS・プリフライトが発生しない
- 認証は Bearer トークン方式（Cookie 不使用）
- OAuth コールバックは Next.js Route Handler で処理

---

## 移行後のアーキテクチャ

```
┌── Vercel (Next.js) ──┐       ┌── Go + Echo (別オリジン) ──────────┐
│                       │       │                                     │
│ ブラウザ (React)      │       │  [CORS Middleware]                  │
│ ┌──────────┐         │       │  [Auth Middleware]                  │
│ │supabase  │─OAuth──→│       │                                     │
│ │SDK       │ /auth/  │       │  GET    /api/videos                 │
│ │          │ callback│       │  GET    /api/videos/:id             │
│ │          │         │       │  POST   /api/videos        (admin)  │
│ │          │ Bearer  │       │  PATCH  /api/videos/:id    (admin)  │
│ │ hooks    │────────────────→│  DELETE /api/videos/:id    (admin)  │
│ │          │         │       │  GET    /api/auth/admin              │
│ │          │         │       │  ...他ドメイン...                    │
│ └──────────┘         │       │                                     │
└───────────────────────┘       │  [DB] pgx / sqlc → Supabase PG    │
                                └─────────────────────────────────────┘
                                          │
                                          ▼
                                   Supabase Auth API
                                   (トークン検証)
```

### 設計方針

- OAuth コールバック (`/auth/callback`) は **Next.js に残す**
  - PKCE のコード交換をブラウザリダイレクト先で処理する必要がある
  - Google Cloud Console・Supabase のリダイレクト URL 設定変更が不要
- データ API・管理者判定 API は **Go + Echo に移動**
- フロントの hooks は fetch URL を環境変数ベースに変更するだけ

---

## 技術スタック（バックエンド）

| レイヤー | 技術 |
|----------|------|
| 言語 | Go |
| Web フレームワーク | Echo |
| DB ドライバ | pgx |
| SQL 生成（任意） | sqlc or 手書き SQL |
| 認証 | Supabase Auth REST API（HTTP 呼び出し） |
| デプロイ | 未定 |

---

## 認証・認可設計

### トークン検証方式

Supabase には Go 公式 SDK がないため、REST API を直接呼び出してトークンを検証する。

```
Go バックエンド → GET https://<ref>.supabase.co/auth/v1/user
                  Headers:
                    Authorization: Bearer <access_token>
                    apikey: <SUPABASE_ANON_KEY>
                ← 200: { id, email, ... }  → email で ADMIN_EMAIL 照合
                ← 401: 無効なトークン
```

| 項目 | 内容 |
|------|------|
| 検証方式 | Supabase Auth API 呼び出し（方式 A） |
| 選定理由 | 管理者1人でリクエスト頻度低、トークン revoke の即時反映が重要 |
| 代替案 | JWT ローカル検証（方式 B: JWT_SECRET で署名検証、ネットワーク不要だが revoke 検知不可） |
| ADMIN_EMAIL 照合 | Go の環境変数 `ADMIN_EMAIL` で現在と同じロジック |

### 認証フロー（変更なし）

1. ブラウザ: Supabase SDK `signInWithOAuth()` → Google 認証
2. Google → Supabase → Next.js `/auth/callback` → `exchangeCodeForSession`
3. ブラウザ: `supabase.auth.getSession()` で access_token 取得（localStorage）
4. ブラウザ: hooks から `Authorization: Bearer <token>` で Go バックエンドへリクエスト
5. Go: Supabase Auth API でトークン検証 → email → ADMIN_EMAIL 照合
6. Go: 管理者操作のみ許可 / 一般ユーザーは閲覧のみ

### トークンリフレッシュ

- Supabase JS SDK がクライアント側で自動リフレッシュ（デフォルト1時間）
- `useAuth.ts` の `onAuthStateChange` → `TOKEN_REFRESHED` で新トークンを反映
- バックエンド側の対応は不要

---

## CORS 設計

クロスオリジンで `Authorization` ヘッダーを送信するため、全リクエストでプリフライト (OPTIONS) が発生する。

### Echo CORS ミドルウェア設定

```go
e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
    AllowOrigins:  []string{"https://your-vercel-app.vercel.app"},
    AllowMethods:  []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
    AllowHeaders:  []string{"Authorization", "Content-Type"},
    ExposeHeaders: []string{"x-total-count", "x-limit", "x-offset"},
    MaxAge:        86400,
}))
```

### 注意点

| 項目 | 内容 |
|------|------|
| `ExposeHeaders` | `x-total-count`, `x-limit`, `x-offset` を明示しないとブラウザから読めない（ページネーション破損） |
| `credentials` | 不要。Bearer トークン方式のため Cookie を送信しない |
| `AllowOrigins` | 本番ドメインのみ許可。開発時は `http://localhost:3000` を追加 |
| `MaxAge` | プリフライトのキャッシュ時間。86400秒（24時間）で preflight 頻度を抑制 |

---

## 移行対象 API エンドポイント

### VideoEntry ドメイン（本プロジェクト）

| メソッド | パス | 用途 | 認証 | 現在の実装 |
|----------|------|------|------|-----------|
| GET | `/api/videos` | 一覧取得 | 不要 | `app/api/videos/route.ts` GET |
| GET | `/api/videos/:id` | 詳細取得 | 不要 | `app/api/videos/[id]/route.ts` GET |
| POST | `/api/videos` | 新規作成 | 管理者 | `app/api/videos/route.ts` POST |
| PATCH | `/api/videos/:id` | 編集 | 管理者 | `app/api/videos/[id]/route.ts` PATCH |
| DELETE | `/api/videos/:id` | 削除 | 管理者 | `app/api/videos/[id]/route.ts` DELETE |
| GET | `/api/auth/admin` | 管理者判定 | Bearer | `app/api/auth/admin/route.ts` GET |

### レスポンス互換要件

Go バックエンドは現在のレスポンス形式を維持する必要がある。

#### GET /api/videos レスポンス

- Body: `VideoItem[]`（JSON 配列）
- Headers: `x-total-count`, `x-limit`, `x-offset`
- `VideoItem` の形式:

```json
{
  "id": "uuid",
  "youtubeUrl": "string",
  "title": "string",
  "thumbnailUrl": "string",
  "tags": ["string"],
  "category": "string",
  "goodPoints": "string",
  "memo": "string",
  "rating": 1,
  "publishDate": "ISO8601 | null",
  "addedDate": "ISO8601"
}
```

- DB カラム `createdAt` → JSON フィールド `addedDate` に変換
- DB カラム `publishDate` → null の場合は JSON `null`
- DB カラム `updatedAt` → レスポンスに含めない

#### GET /api/videos クエリパラメータ

| パラメータ | デフォルト | 範囲 |
|-----------|-----------|------|
| `sort` | `added` | `added` / `published` / `rating` |
| `order` | `desc` | `asc` / `desc` |
| `q` | (なし) | タイトル部分一致 + タグ一致 |
| `tag` | (なし) | タグ一致 |
| `category` | (なし) | カテゴリ一致 |
| `limit` | `10` | 1〜100 |
| `offset` | `0` | 0〜 |

#### GET /api/auth/admin レスポンス

- 200: `{ "isAdmin": true }`
- 401: `{ "isAdmin": false }`

---

## フロント側の影響

### 影響度: 低

hooks に API 呼び出しが集約されているため、修正箇所が限定的。

### 修正ファイル（3ファイル・6箇所）

| ファイル | 箇所 | 変更内容 |
|----------|------|---------|
| `hooks/useVideos.ts:38` | GET 一覧 | `/api/videos` → `${API_BASE}/videos` |
| `hooks/useVideos.ts:79` | DELETE | `/api/videos/${id}` → `${API_BASE}/videos/${id}` |
| `hooks/useVideoForm.ts:66` | POST | `/api/videos` → `${API_BASE}/videos` |
| `hooks/useVideoForm.ts:99` | PATCH | `/api/videos/${id}` → `${API_BASE}/videos/${id}` |
| `hooks/useAuth.ts:25` | GET 管理者判定 | `/api/auth/admin` → `${API_BASE}/auth/admin` |
| `lib/constants.ts` | 環境変数定義 | `API_BASE` 定数を追加 |

### 環境変数の追加

```ts
// lib/constants.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
```

| 環境 | `NEXT_PUBLIC_API_BASE_URL` | 動作 |
|------|---------------------------|------|
| 開発（移行前） | 未設定 → `/api` | 今まで通り Next.js Route Handlers |
| 開発（Go 起動時） | `http://localhost:8080/api` | ローカル Go バックエンド |
| 本番（移行後） | `https://api.your-domain.com/api` | 本番 Go バックエンド |

### 変更不要のファイル

| ファイル / ディレクトリ | 理由 |
|----------------------|------|
| `components/*` 全体 | hooks 経由でデータを受け取るだけ |
| `lib/types.ts` | 型定義はそのまま |
| `lib/youtube.ts` | クライアント側サムネ生成 |
| `lib/validation.ts` | フロント側バリデーションとして残す |
| `lib/auth.ts` | Supabase SDK のログイン/ログアウト（変更なし） |
| `lib/supabase/client.ts` | クライアント SDK（変更なし） |
| `app/auth/callback/route.ts` | OAuth コールバック（Next.js に残す） |

### 削除対象ファイル（移行完了後）

| ファイル | 理由 |
|---------|------|
| `app/api/videos/route.ts` | Go に移行 |
| `app/api/videos/[id]/route.ts` | Go に移行 |
| `app/api/auth/admin/route.ts` | Go に移行 |
| `lib/auth-server.ts` | サーバー側認証ガード → Go に移行 |
| `lib/db.ts` | Prisma クライアント → 不要 |
| `prisma/schema.prisma` | Prisma スキーマ → 不要 |

### 削除対象パッケージ（package.json）

- `@prisma/client`（dependencies）
- `prisma`（devDependencies）

※ `@supabase/supabase-js` はクライアント認証で引き続き使用するため残す。

### E2E テスト

- API モックのパスが `/api/videos` 固定の場合、環境変数に応じた修正が必要な可能性あり
- E2E テストは開発環境で実行するため、`NEXT_PUBLIC_API_BASE_URL` 未設定なら影響なし

---

## Go バックエンド 環境変数

| 変数名 | 用途 |
|--------|------|
| `DATABASE_URL` | Supabase Postgres 接続文字列 |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key（トークン検証の apikey ヘッダー用） |
| `ADMIN_EMAIL` | 管理者メールアドレス |
| `ALLOWED_ORIGINS` | CORS 許可オリジン（カンマ区切り） |
| `PORT` | サーバーポート（デフォルト: 8080） |

---

## バリデーション

| 側 | 方針 |
|----|------|
| フロント | `lib/validation.ts` をそのまま維持（UX 用） |
| バックエンド | Go で同等のバリデーションを実装（セキュリティ用） |

バリデーションルール（両方で適用）:

| フィールド | ルール |
|-----------|--------|
| `youtubeUrl` | 必須 |
| `title` | 必須 |
| `tags` | 各10文字以内 |
| `category` | 10文字以内 |
| `goodPoints` | 2000文字以内 |
| `memo` | 2000文字以内 |
| `rating` | 1〜5 の整数 |

---

## リスク評価

| 懸念 | リスク | 対策 |
|------|--------|------|
| CORS / プリフライト | 低 | Echo CORS ミドルウェアで一括設定 |
| `x-total-count` 非公開 | 中 | `ExposeHeaders` に明示 |
| Supabase トークン検証 | 低 | REST API 直接呼び出しで実現可能 |
| OAuth コールバック | 低 | Next.js に残すため変更なし |
| トークンリフレッシュ | なし | クライアント SDK が自動処理 |
| Cookie / credentials | なし | Bearer 方式のため不要 |
| レスポンス形式の互換性 | 中 | `VideoItem` 型 + ヘッダーを Go 側で完全再現 |
| DB カラム名の camelCase | 中 | Go struct タグで JSON/DB マッピングを定義 |
