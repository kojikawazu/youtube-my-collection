import { defineConfig } from "vitest/config";
import path from "path";
import { IT_DATABASE_URL } from "./src/test/it-db";

// 結合テスト（IT）専用構成。UT（jsdom・DB なし）と分離し、実 Prisma + Postgres で
// Route Handler を実行する。DB 状態を共有するため直列実行にする。
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.it.test.ts"],
    globalSetup: ["./src/test/it-global-setup.ts"],
    setupFiles: ["./src/test/it-setup.ts"],
    // 同一 DB を共有するため、ファイル間の並列とテスト間の並行を止めて競合を防ぐ。
    fileParallelism: false,
    sequence: { concurrent: false },
    env: {
      DATABASE_URL: IT_DATABASE_URL,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
