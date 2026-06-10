# データ仕様書

データモデルと DB スキーマ（Prisma）を定義する。API のレスポンス形式は [`07-api-specification.md`](./07-api-specification.md) を参照。

## 目次

- [エンティティ: VideoEntry（旧称 video_entries）](#エンティティ-videoentry旧称-video_entries)
  - [フィールド](#フィールド)
  - [インデックス](#インデックス)
  - [派生データ](#派生データ)
  - [補足](#補足)
- [Prisma スキーマ](#prisma-スキーマ)
  - [制約（アプリ側でバリデーション）](#制約アプリ側でバリデーション)

## エンティティ: VideoEntry（旧称 video_entries）

### フィールド

| フィールド | 型 | 説明 |
|-----------|----|------|
| id | UUID | 主キー（`@default(uuid())`） |
| youtubeUrl | 文字列 | 必須 |
| title | 文字列 | ユーザー入力 |
| thumbnailUrl | 文字列 | YouTube URL からクライアント側で自動生成 |
| tags | 文字列配列 | 各タグ 10 文字以内 |
| category | 文字列 | 10 文字以内、UI は単一プリセット選択 |
| goodPoints | テキスト | 2000 文字以内、markdown |
| memo | テキスト | 2000 文字以内、markdown |
| rating | 整数 | 1-5 |
| publishDate | 日時 (nullable) | 将来拡張 |
| createdAt | 日時 | 追加日（`@default(now())`） |
| updatedAt | 日時 | 更新日時（`@updatedAt`） |

### インデックス

- `createdAt`（追加日順）
- `rating`（良かった順）
- `publishDate`（将来拡張）

### 派生データ

- `thumbnailUrl` はクライアント側で YouTube URL から自動生成
- `title` はユーザー入力

### 補足

- UI はカテゴリのプリセットを提供するが、API は文字列として扱う
- カテゴリプリセットは [`02-requirements-specification.md`](./02-requirements-specification.md) を参照（`未分類` はフォールバック値）

## Prisma スキーマ

`front/prisma/schema.prisma` に定義。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

### 制約（アプリ側でバリデーション）

| フィールド | ルール |
|-----------|--------|
| tags | 各 10 文字以内 |
| category | 10 文字以内 |
| goodPoints | 2000 文字以内 |
| memo | 2000 文字以内 |
| rating | 1-5 |

> スキーマ更新は `prisma db pull` のみ使用。手順は [`09-architecture-specification.md`](./09-architecture-specification.md) を参照。
