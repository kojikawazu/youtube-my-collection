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
    },
  },
});
