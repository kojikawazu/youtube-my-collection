# Prismaスキーマ案

## 前提
- Supabase Postgres を使用
- Prisma をORMとして採用

## schema.prisma (案)
```prisma
// datasource/ generator は環境に合わせて調整
model VideoEntry {
  id           String   @id @default(uuid())
  youtubeUrl   String
  title        String
  thumbnailUrl String
  tags         String[]
  category     String
  goodPoints   String
  memo         String
  rating       Int
  publishDate  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([createdAt])
  @@index([rating])
  @@index([publishDate])
}
```

## 制約(アプリ側でバリデーション)
- tags: 各10文字以内
- category: 10文字以内
- goodPoints: 2000文字以内
- memo: 2000文字以内
- rating: 1-5
