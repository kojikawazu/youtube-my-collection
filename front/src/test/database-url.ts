/**
 * テスト（IT / E2E）が接続してよい DB のホスト。
 * ここに無いホストへは絶対に接続させない（allowlist 方式）。
 */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** テスト用 DB の既定接続先（`front/docker-compose.test.yml` の Postgres）。 */
const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ymc_test?schema=public";

/**
 * テスト用 DB の接続先を解決する。IT・E2E の唯一の入口。
 *
 * **`DATABASE_URL` は意図的に参照しない。** `@prisma/client` を import した時点で `.env` が
 * `process.env` へ読み込まれるため、`process.env.DATABASE_URL ?? ローカル` と書くと
 * `.env` の本番 URL を拾う。E2E の seed は先頭で `deleteMany()` するため、
 * これは本番データの全削除に直結する（2026-07-31 に発生）。
 *
 * 上書きが必要な場合はテスト専用の `TEST_DATABASE_URL` を使う。さらに保険として、
 * 解決結果が localhost 以外なら接続前に throw する。
 * @param context 失敗メッセージに出す呼び出し元（"IT" / "E2E"）
 * @returns 検証済みのテスト用 DB 接続 URL
 * @throws {Error} 接続先が localhost 以外、または URL として解釈できない場合。
 *   テストが本番などのリモート DB を破壊するのを防ぐため、握り潰さず必ず失敗させる
 */
export const resolveTestDatabaseUrl = (context: string): string => {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(
      `[${context}] TEST_DATABASE_URL を URL として解釈できません。接続先を確認してください。`,
    );
  }

  if (!LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(
      `[${context}] テストはローカルの DB にしか接続できません（接続先ホスト: ${hostname}）。\n` +
        `テストの seed は既存データを全削除するため、リモート DB を指すと破壊されます。\n` +
        `  起動: docker compose -f docker-compose.test.yml up -d\n` +
        `  既定: ${DEFAULT_TEST_DATABASE_URL}\n` +
        `（本番の DATABASE_URL は参照しません。上書きは TEST_DATABASE_URL で行ってください）`,
    );
  }

  return url;
};
