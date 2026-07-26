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

## 監査列

監査列（`createdAt` / `updatedAt` / `deletedAt`）は **Prisma の機構で自動設定する**。アプリケーションコードで値を組み立てない。

- **手動代入を禁止**する。`data: { updatedAt: new Date() }` のように Route Handler や `lib/` のヘルパーで監査列へ値を書かない（`updatedAt` の手動指定は `@updatedAt` の自動更新を上書きしてしまう）。
- 日時は**スキーマ側で宣言**する: `createdAt DateTime @default(now())` / `updatedAt DateTime @updatedAt`。
- **`createdAt` は更新しない。** 更新系の `data` に `createdAt` を含めない。
- 論理削除を採用する場合、`deletedAt` も削除ヘルパー（middleware / extension）経由で設定する。呼び出し側で `deletedAt: new Date()` を書かない。
- **例外**: シードデータ・テストで日時を固定したい場合のみ明示指定を許容する（IT の `seedVideo` が `createdAt` を上書きして並び替えを検証している）。この場合も本番コードパスには持ち込まない。

> 操作ユーザー（`createdBy` / `updatedBy`）は現在のスキーマに無い。追加する場合は各ユースケースで個別に詰めず、Prisma Client Extension（`$extends` の query フック）でリクエストコンテキストから自動注入する。

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
