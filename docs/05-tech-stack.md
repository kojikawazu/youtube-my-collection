# 技術スタック

## フレームワーク
- Next.js (App Router)
- TypeScript
- Tailwind CSS

## 認証
- Supabase Auth (Google OAuth2)
- 許可メールアドレス1件のみ許可

## データベース
- Supabase Postgres
- ORM: Prisma

## API
- Next.js Route Handlers (`app/api/*`) でDBアクセス

## デプロイ
- 本番: Vercel（`main` ブランチ、`front/` のみ）

## 実装配置
- `front/` にフロントアプリを新規実装

## データ方針
- Supabase Postgres を前提に実装
- API経由でUIが取得・更新
