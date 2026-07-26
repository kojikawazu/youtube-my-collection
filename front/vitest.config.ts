import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // IT（*.it.test.ts）は DB 依存のため専用構成（vitest.it.config.ts）で実行する。
    exclude: ["node_modules", "tests/e2e/**", "src/**/*.it.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only は "react-server" 条件が無い環境では意図的に throw する実装。
      // Vitest は Next のサーバー実行環境ではないため、Route Handler の UT が
      // lib/auth-server を import した時点で失敗する。境界チェックは
      // CI のビルドで担保するので、テストでは空モジュールへ差し替える。
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
