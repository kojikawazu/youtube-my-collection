import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./tests/e2e/db-url";

export default defineConfig({
  testDir: "./tests/e2e",
  // 公開フローは実テスト DB を共有し seed で作り直すため、直列実行で競合を防ぐ。
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "dot" : "list",
  // webServer 起動前にテスト DB へマイグレーションを適用する。
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // 実 route が読む DB をテスト DB に固定する（.env.local より process.env が優先される）。
    env: { DATABASE_URL: E2E_DATABASE_URL },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
