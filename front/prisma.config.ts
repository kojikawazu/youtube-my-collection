import { defineConfig } from "prisma/config";

// Prisma CLI（migrate / db pull / generate）の設定。
//
// **`.env` / `.env.local` を読み込まない（`import "dotenv/config"` を書かない）。**
// 2026-07-31 に、Prisma が `.env` を暗黙に読み込んだ結果、テストの接続先が本番に解決され
// 本番データが全削除された。Prisma 7 で暗黙の読み込みが無くなったため、ここで戻さない。
// 接続先は呼び出し側が必ず明示する:
//   - IT / E2E: globalSetup が検証済みのテスト DB URL を DATABASE_URL に詰めて渡す
//   - 本番 DB への db pull 等: `pnpm db:pull`（.env.local を明示指定して読み込む）
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // generate は DB に接続しないため、未設定でも設定読み込みで落とさない。
    // 接続するコマンド（migrate / db pull）は URL 未設定なら Prisma 自身がエラーにする。
    url: process.env.DATABASE_URL,
  },
});
