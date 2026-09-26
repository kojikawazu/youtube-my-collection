// レートリミットの外部 I/O（Upstash Redis）を差し替えるテスト用モック。
// Route Handler の UT / IT で同じ差し替えを繰り返さないために共有する（セットアップの共通化）。
// 判定ロジック（lib/rate-limit）自体は実物を通し、Upstash への問い合わせだけを置き換える。
//
// 使い方（import の順序が重要）:
//   import { limitMock } from "@/test/upstash-mock";   // ← route より先に import する
//   vi.mock("@upstash/redis", () => import("@/test/upstash-mock").then((m) => m.redisModule));
//   vi.mock("@upstash/ratelimit", () => import("@/test/upstash-mock").then((m) => m.ratelimitModule));
//   import { GET } from "../route";
//
// lib/rate-limit は接続設定をモジュール読み込み時に 1 度だけ解釈するため、route（→ lib/rate-limit）より
// 先に本モジュールを読み込ませて環境変数を入れておく必要がある。
import { vi } from "vitest";

process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "upstash-token";

/** `Ratelimit#limit` の差し替え。既定の応答はテスト側の beforeEach で決める。 */
export const limitMock = vi.fn();

/** `@upstash/redis` の差し替え。接続は行わない。 */
export const redisModule = { Redis: vi.fn() };

/** `@upstash/ratelimit` の差し替え。インスタンスの `limit` を `limitMock` に向ける。 */
export const ratelimitModule = {
  Ratelimit: Object.assign(
    // `new Ratelimit(...)` で呼ばれるため、アロー関数ではなく function で定義する。
    vi.fn(function (this: { limit: typeof limitMock }) {
      this.limit = limitMock;
    }),
    { slidingWindow: vi.fn() },
  ),
};
