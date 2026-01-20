# Supabase / Prisma セットアップ

## 環境変数
`front/.env.local`
```
DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@db.tbcpytvlzuknfxbaijbg.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://tbcpytvlzuknfxbaijbg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=...
NEXT_PUBLIC_ADMIN_EMAIL=...
```

## Prisma
- `front/prisma/schema.prisma` にスキーマ定義済み
- 次のコマンドで反映
```
cd front
npx prisma migrate dev --name init
npx prisma generate
```

## Pooler接続メモ
- Direct接続が通らない場合はSession poolerを利用
- `DATABASE_URL` は poolerのURIを利用
- 例: `postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1`

## API
- `GET /api/videos`
- `GET /api/videos/:id`
- `POST /api/videos`
- `PATCH /api/videos/:id`
- `DELETE /api/videos/:id`

※ 認証は未接続。API保護はタスク03で対応。
