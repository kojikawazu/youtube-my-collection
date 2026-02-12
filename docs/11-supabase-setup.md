# Supabase / Prisma セットアップ

## 環境変数
`front/.env.local`
```
DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Prisma
- `front/prisma/schema.prisma` にスキーマ定義済み
- スキーマの更新は `prisma db pull` のみ使用
```
cd front
npx prisma db pull
npx prisma generate
```

## Pooler接続メモ
- Direct接続が通らない場合はSession poolerを利用
- `DATABASE_URL` は poolerのURIを利用
- 例: `postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1`

## Auth
- Google OAuth2 (PKCE)
- `/auth/callback` でコードをセッションへ交換
- `ADMIN_EMAIL` でallowlist判定（サーバー側のみ）

## API
- `GET /api/videos`
- `GET /api/videos/:id`
- `POST /api/videos`
- `PATCH /api/videos/:id`
- `DELETE /api/videos/:id`
