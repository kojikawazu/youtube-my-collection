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
- 本番: Google Cloud Run
- 開発/プレビュー: Vercel

## 実装配置
- `front/` にフロントアプリを新規実装

## データ方針(初期)
- インメモリ実装から開始
- 後でSupabaseに移行できるようにリポジトリ層を分離
