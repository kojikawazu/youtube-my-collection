import { execFileSync } from "node:child_process";
import { IT_DATABASE_URL } from "./it-db";

/**
 * IT 全体の前処理。テスト用 Postgres へ Prisma マイグレーションを適用してスキーマを揃える。
 * Postgres 未起動（docker compose 未 up）なら分かりやすく失敗させる。
 * @returns Vitest の globalSetup 契約に沿う（後処理不要のため teardown は返さない）
 */
export default function setup() {
  process.env.DATABASE_URL = IT_DATABASE_URL;
  try {
    // 固定コマンドのみ。shell を介さない execFileSync で引数配列を渡す。
    execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: IT_DATABASE_URL },
    });
  } catch {
    throw new Error(
      `IT の DB 準備に失敗しました。テスト用 Postgres を起動してください:\n` +
        `  docker compose -f docker-compose.test.yml up -d\n` +
        `接続先: ${IT_DATABASE_URL}`,
    );
  }
}
