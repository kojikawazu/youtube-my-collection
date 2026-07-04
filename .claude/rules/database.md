---
description: Prisma ORM 命名規約・マイグレーション・クエリ規約
globs: "front/prisma/**,front/src/lib/**"
---

# データベースルール（Prisma）

## 命名規約

- テーブル名（モデル名）: PascalCase・単数形（例: `User`, `TaskComment`）— Prisma の規約に従う
- カラム名（フィールド名）: camelCase（例: `userId`, `createdAt`）— Prisma の規約に従う
- DB 上のテーブル名: `@@map()` で snake_case・複数形にマッピング可（例: `@@map("task_comments")`）

## 共通フィールド

すべてのモデルに以下のフィールドを含める:

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | String @id @default(uuid()) | 主キー（UUID） |
| createdAt | DateTime @default(now()) | 作成日時 |
| updatedAt | DateTime @updatedAt | 更新日時 |
| deletedAt | DateTime? | 論理削除日時（要件に応じて） |

## 論理削除

- 論理削除を採用する場合: `deletedAt` フィールドを追加。
- 読み取りクエリには `where: { deletedAt: null }` を必ず付与する。
- Prisma middleware または拡張で一括適用を検討する。

## マイグレーション

- `prisma migrate dev` で開発環境のマイグレーションを管理する。
- `prisma migrate deploy` で本番環境に適用する。
- マイグレーションファイルは手動で編集しない。
- スキーマは手書きせず `prisma db pull` で取り込む方針（[`docs/10-miscellaneous-specification.md`](../../docs/10-miscellaneous-specification.md) 参照）。

## クエリ

- Prisma Client のパラメータバインディングを使用する。`$queryRaw` での文字列結合は禁止。

> データ仕様の正準は [`docs/05-data-specification.md`](../../docs/05-data-specification.md)。
