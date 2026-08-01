import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./tests/e2e/db-url";

// E2E 専用ポート。開発で最も衝突しやすい 3000 を避ける。
// 3000 を他アプリ（別プロジェクトの dev/preview サーバー等）が使っていても影響を受けない。
const E2E_PORT = 3100;
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

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
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    // 既存サーバーを再利用しない。再利用を許すと「そのポートで応答する何か」を無検証で
    // テスト対象にしてしまい、別アプリが居座っていても全件失敗という形でしか現れない
    // （実際に発生・issue #176）。Playwright が起動したサーバーだけを使えば、
    // 対象が自分のアプリであることが定義上保証される。ポートが埋まっていれば明確に失敗する。
    reuseExistingServer: false,
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
