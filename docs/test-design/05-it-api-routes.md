# 結合テスト設計 — API Route Handler（実 DB）

Route Handler を実 Prisma + PostgreSQL で実行する結合テスト（IT）のケース表。UT/E2E の狭間で実行されていなかった `api/videos*` の認可・ページング・検証配線・DB マッピングを検証する。

- ツール: Vitest（node 環境）+ `docker-compose.test.yml` の PostgreSQL
- モック境界: **Supabase 認証（`getUser`）のみ**モック。Route Handler・`requireAdmin`・Prisma/DB は実物
- 前処理: `prisma migrate deploy`（globalSetup）／各テスト前に `VideoEntry` truncate（setup）
- ファイル: `src/app/api/videos/__tests__/route.it.test.ts`、`src/app/api/videos/[id]/__tests__/route.it.test.ts`

## `GET /api/videos`（公開）

| # | ケース | 分類 |
|---|--------|------|
| L-1 | 空 DB → `[]` + `x-total-count=0` | 正常系 |
| L-2 | seed 済み → API 形（`addedDate` 付き）で返す | 正常系 |
| L-3 | `limit`/`offset` でページング、`x-total-count` は総件数 | 正常系 |
| L-4 | `sort=rating&order=desc` で評価降順 | 正常系 |
| L-5 | `q` でタイトル部分一致（大小無視） | 正常系 |
| L-6 | `tag` 絞り込みで該当のみ | 正常系 |
| L-7 | `limit` 範囲外は max=100 にクランプ | 準正常系 |

## `POST /api/videos`（管理者）

| # | ケース | 分類 |
|---|--------|------|
| C-1 | 管理者 + 有効入力 → 201 + DB 反映 | 正常系 |
| C-2 | Authorization 無し → 401、作成しない | 準正常系 |
| C-3 | 管理者メール不一致 → 403、作成しない | 準正常系 |
| C-4 | 必須欠落 → 400、作成しない | 準正常系 |

## `GET/PATCH/DELETE /api/videos/[id]`

| # | ケース | 分類 |
|---|--------|------|
| G-1 | 存在 ID → 200 で返す | 正常系 |
| G-2 | 不存在 ID → 404 | 準正常系 |
| P-1 | 送信フィールドのみ更新・未送信は維持 | 正常系 |
| P-2 | 未認証 → 401、更新しない | 準正常系 |
| P-3 | 不存在 ID の更新（Prisma P2025）→ 404 | 異常系 |
| P-4 | 検証エラー（評価範囲外）→ 400、更新しない | 準正常系 |
| D-1 | 管理者 → 200 で削除 | 正常系 |
| D-2 | 未認証 → 401、削除しない | 準正常系 |
