# Supabase / Prisma セットアップ

## 環境変数
`front/.env.local`
```
DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@db.tbcpytvlzuknfxbaijbg.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://tbcpytvlzuknfxbaijbg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=...
```

## Prisma
- `front/prisma/schema.prisma` にスキーマ定義済み
- 次のコマンドで反映
```
cd front
npx prisma migrate dev --name init
npx prisma generate
```

## API
- `GET /api/videos`
- `GET /api/videos/:id`
- `POST /api/videos`
- `PATCH /api/videos/:id`
- `DELETE /api/videos/:id`

※ 認証は未接続。API保護はタスク03で対応。
