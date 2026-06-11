# アーキテクチャ仕様書

システム構成・技術スタック・インフラ・セットアップ手順を定義する。OAuth の処理フローは [`notes/oauth-sequence.md`](./notes/oauth-sequence.md)、共通バックエンド移行計画は [`notes/go-echo-backend-plan.md`](./notes/go-echo-backend-plan.md) を参照。

## 目次

- [技術スタック](#技術スタック)
- [構成方針](#構成方針)
- [環境変数](#環境変数)
- [ローカル開発セットアップ（ゼロから動かす）](#ローカル開発セットアップゼロから動かす)
- [Prisma セットアップ](#prisma-セットアップ)
  - [Pooler 接続メモ](#pooler-接続メモ)
- [Auth 構成](#auth-構成)
- [パフォーマンス・可用性](#パフォーマンス可用性)
- [将来構成](#将来構成)

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フレームワーク | Next.js (App Router) / TypeScript / Tailwind CSS |
| 認証 | Supabase Auth (Google OAuth2, PKCE) + `ADMIN_EMAIL` allowlist |
| データベース | Supabase Postgres / ORM: Prisma |
| API | Next.js Route Handlers (`app/api/*`) で DB アクセス |
| バリデーション / API ドキュメント | Zod（`lib/schemas/`）を単一ソースに検証・型・OpenAPI を導出。`@asteasolutions/zod-to-openapi` で OpenAPI 生成、`/docs` に Swagger UI |
| デプロイ | 本番: Vercel（`main` ブランチ、`front/` のみ） |

## 構成方針

- `front/` にフロントアプリを実装
- データは Supabase Postgres を前提（インメモリは廃止）
- API 経由で UI がデータを取得・更新（同一オリジン、Bearer トークン認証）

## 環境変数

`front/.env.local` に設定する（テンプレートは [`front/.env.example`](../front/.env.example)）。アプリのコードが実際に参照するのは以下の 5 つのみ。

| 変数 | 用途 | 参照箇所 |
|------|------|----------|
| `DATABASE_URL` | DB 接続（Supabase Postgres） | Prisma (`schema.prisma`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | クライアント SDK / トークン検証 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（`getUser` の apikey） | 同上 |
| `ADMIN_EMAIL` | 管理者 allowlist（サーバーのみ） | `lib/auth-server.ts` / `api/auth/admin` |
| `NEXT_PUBLIC_SITE_URL` | OAuth リダイレクト先のベース URL | `lib/auth.ts` / `auth/callback` |

> Google OAuth の client id / secret は **Supabase ダッシュボード側**で設定するため、アプリの env には不要。`SUPABASE_SERVICE_ROLE_KEY` や `NEXT_PUBLIC_ADMIN_EMAIL` は現在のコードでは未使用（後者は廃止済み。[`notes/admin-email-exposure-mitigation.md`](./notes/admin-email-exposure-mitigation.md) 参照）。

## ローカル開発セットアップ（ゼロから動かす）

新規参画者が手元で動かすまでの一本道。

1. **前提ツール**: Node.js 20 系、pnpm（`corepack enable` で `packageManager` ピン留めの `pnpm@10.7.0` が有効化される）。
2. **Supabase プロジェクト作成**: [supabase.com](https://supabase.com) でプロジェクトを作成し、`Project URL` と `anon key`、DB パスワードを控える。
3. **Google OAuth 設定**（管理者ログインを試す場合）: Supabase の Authentication → Providers で Google を有効化。Google Cloud Console 側のリダイレクト URI に `https://<PROJECT_REF>.supabase.co/auth/v1/callback` を登録。詳細は [`notes/oauth-sequence.md`](./notes/oauth-sequence.md) / [`notes/auth-troubleshooting.md`](./notes/auth-troubleshooting.md)。
4. **env 設定**:
   ```bash
   cd front
   cp .env.example .env.local   # 控えた値を記入。ADMIN_EMAIL は自分の Google アカウント
   ```
5. **依存インストール & Prisma 生成**:
   ```bash
   pnpm install
   pnpm exec prisma db pull     # 既存スキーマを取り込み
   pnpm exec prisma generate
   ```
6. **起動**:
   ```bash
   pnpm dev                     # http://localhost:3000
   ```
7. **データ投入**: 現状 seed スクリプトはないため、管理者でログイン後に UI から追加するか、Supabase 上で直接 `VideoEntry` に行を追加する。
8. **テスト**: `pnpm test`（ユニット）/ `pnpm test:e2e`（E2E、初回は `pnpm exec playwright install`）。

## Prisma セットアップ

- `front/prisma/schema.prisma` にスキーマ定義済み（[`05-data-specification.md`](./05-data-specification.md) 参照）
- スキーマの更新は `prisma db pull` のみ使用

```bash
cd front
npx prisma db pull
npx prisma generate
```

### Pooler 接続メモ

- Direct 接続が通らない場合は Session pooler を利用
- `DATABASE_URL` は pooler の URI を利用
- 例: `postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1`

## Auth 構成

- Google OAuth2 (PKCE)
- `/auth/callback` でコードをセッションへ交換
- `ADMIN_EMAIL` で allowlist 判定（サーバー側のみ）
- 詳細シーケンスは [`notes/oauth-sequence.md`](./notes/oauth-sequence.md)

## パフォーマンス・可用性

CDN キャッシュ / スケルトン UI / Vercel Cron ウォームアップ等の方針は [`04-non-functional-specification.md`](./04-non-functional-specification.md) を参照。

## API ドキュメント生成（Zod 単一ソース）

- `lib/schemas/video.ts` の Zod スキーマを「検証・TypeScript 型・OpenAPI」の単一ソースとする。
- `lib/openapi.ts` が OpenAPI 3.0 を生成し、`GET /api/openapi.json` で配信。`GET /docs` が CDN の Swagger UI（SRI 付き）で表示する。
- 詳細・将来の TypeSpec / Go 契約への発展は [`notes/openapi-zod-plan.md`](./notes/openapi-zod-plan.md) を参照。

## 将来構成

Go + Echo 共通バックエンドへの API 移行計画は [`notes/go-echo-backend-plan.md`](./notes/go-echo-backend-plan.md) を参照。
移行時は本計画で得た自動生成 OpenAPI を TypeSpec へ起こし直し、Next/Go の共有契約に格上げする。
