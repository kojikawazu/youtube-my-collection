// レートリミット（Upstash Redis）の環境変数を解釈する純粋関数。
// 実行時（lib/rate-limit.ts）とビルド時（next.config.ts）の双方から参照するため、
// server-only を付けず、process.env も直接読まない（呼び出し側が env を渡す）。
// 設計は docs/06-security-specification.md「レートリミット」を正本とする。

/** Upstash Redis への接続設定。 */
export type UpstashConfig = {
  /** REST API のエンドポイント（`UPSTASH_REDIS_REST_URL`） */
  url: string;
  /** REST API のトークン（`UPSTASH_REDIS_REST_TOKEN`）。サーバー専用のシークレット */
  token: string;
};

/**
 * 判定に使う環境変数。`process.env` をそのまま渡せ、テストでは任意の組み合わせを渡せる形にする。
 * 参照するキーは `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` / `VERCEL_ENV` のみ。
 */
type RateLimitEnv = Record<string, string | undefined>;

/**
 * Upstash の接続設定を解決する。URL とトークンの**両方**が揃っている場合のみ設定を返す。
 * 片方だけでは接続できないため、揃っていなければ「未設定」として扱う。
 * @param env 環境変数（通常は `process.env`）
 * @returns 接続設定。未設定なら null（レートリミットは無効になる）
 */
export const resolveUpstashConfig = (env: RateLimitEnv): UpstashConfig | null => {
  const url = env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  return url && token ? { url, token } : null;
};

/**
 * 本番ビルドで Upstash が未設定なら失敗させる。
 *
 * 実行時のレートリミットは未設定だと無効化して通す（CI / E2E / Preview を壊さないため）。
 * そのままでは本番で設定を漏らしたときに**静かに無防備になる**ので、本番に限りビルドで止める。
 * ビルド失敗なら本番は直前の正常なデプロイのまま残り、失敗が Vercel 上で見える。
 * @param env 環境変数（通常は `process.env`）。`VERCEL_ENV` は Vercel がビルド時に設定する
 * @throws {Error} `VERCEL_ENV` が `production` で、Upstash の接続設定が揃っていない場合
 */
export const assertRateLimitConfiguredForProduction = (env: RateLimitEnv): void => {
  if (env.VERCEL_ENV !== "production") return;
  if (resolveUpstashConfig(env)) return;
  throw new Error(
    "[rate-limit] 本番ビルドには UPSTASH_REDIS_REST_URL と UPSTASH_REDIS_REST_TOKEN の設定が必要です" +
      "（未設定のままでは認証系エンドポイントのレートリミットが無効になる）。" +
      "Vercel の Production 環境変数を設定してから再デプロイしてください。",
  );
};
