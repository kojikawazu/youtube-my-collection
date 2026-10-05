/**
 * テスト（IT / E2E）が接続してよい DB のホスト。
 * ここに無いホストへは絶対に接続させない（allowlist 方式）。
 */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** テスト用 DB の既定接続先（`front/docker-compose.test.yml` の Postgres）。 */
const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ymc_test?schema=public";

/**
 * 接続先がローカルの DB であることを検証する。テストが DB を書き換える直前の最終防衛線。
 *
 * `resolveTestDatabaseUrl` の入口検証に加え、`deleteMany()` の直前に「Prisma に実際に渡した URL」を
 * もう一度ここに通す。入口で正しく解決しても、Prisma へ渡す経路の書き換え（Prisma 7 の driver adapter
 * 移行など）で別の値が入り込めば入口の検証は効かないため、破壊操作の直前で独立に確かめる。
 * @param url 検証する接続 URL（未設定は undefined）
 * @param context 失敗メッセージに出す呼び出し元（"IT" / "E2E"）
 * @returns 検証済みの接続 URL（入力と同一）
 * @throws {Error} URL が未設定・URL として解釈できない・接続先が localhost 以外の場合。
 *   テストが本番などのリモート DB を破壊するのを防ぐため、握り潰さず必ず失敗させる
 */
export const assertLocalDatabaseUrl = (url: string | undefined, context: string): string => {
  if (url === undefined || url === "") {
    throw new Error(`[${context}] テスト DB の接続先が未設定です。`);
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(
      `[${context}] テスト DB の接続先を URL として解釈できません。TEST_DATABASE_URL を確認してください。`,
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

/**
 * テスト用 DB の接続先を解決する。IT・E2E の唯一の入口。
 *
 * **`DATABASE_URL` は意図的に参照しない。** Prisma 6 までは `@prisma/client` を import した時点で
 * `.env` が `process.env` へ読み込まれたため、`process.env.DATABASE_URL ?? ローカル` と書くと
 * `.env` の本番 URL を拾った。E2E の seed は先頭で `deleteMany()` するため、
 * これは本番データの全削除に直結した（2026-07-31 に発生）。Prisma 7 で暗黙の読み込みは無くなったが、
 * シェルや CI が DATABASE_URL を本番に設定している可能性は残るため、方針は変えない。
 *
 * 上書きが必要な場合はテスト専用の `TEST_DATABASE_URL` を使う。さらに保険として、
 * 解決結果が localhost 以外なら接続前に throw する。
 * @param context 失敗メッセージに出す呼び出し元（"IT" / "E2E"）
 * @returns 検証済みのテスト用 DB 接続 URL
 * @throws {Error} 接続先が localhost 以外、または URL として解釈できない場合。
 *   テストが本番などのリモート DB を破壊するのを防ぐため、握り潰さず必ず失敗させる
 */
export const resolveTestDatabaseUrl = (context: string): string =>
  assertLocalDatabaseUrl(process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL, context);
