import { execFileSync } from "node:child_process";
import { E2E_DATABASE_URL } from "./db-url";

/**
 * E2E 全体の前処理。テスト DB へ Prisma マイグレーションを適用してスキーマを揃える。
 * webServer 起動前に走るため、公開 route が実 DB を読める状態を保証する。
 * @returns Playwright の globalSetup 契約に沿う（後処理不要）
 */
export default function globalSetup() {
  try {
    // 固定コマンドのみ。shell を介さない execFileSync で引数配列を渡す。
    execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    });
  } catch {
    throw new Error(
      `E2E の DB 準備に失敗しました。テスト用 Postgres を起動してください:\n` +
        `  docker compose -f docker-compose.test.yml up -d\n` +
        `接続先: ${E2E_DATABASE_URL}`,
    );
  }
}
