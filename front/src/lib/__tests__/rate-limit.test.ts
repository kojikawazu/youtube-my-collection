import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RATE_LIMIT_MESSAGE } from "@/constants/auth";

// 外部 I/O（Upstash Redis への問い合わせ）のみモックする。
// 判定結果の解釈・429 の組み立て・無効化とフェイルオープンの分岐は実物を通す。
const limitMock = vi.fn();
const ratelimitCtor = vi.fn();
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(),
}));
vi.mock("@upstash/ratelimit", () => ({
  // `new Ratelimit(...)` で呼ばれるため、アロー関数ではなく function で定義する。
  Ratelimit: Object.assign(
    vi.fn(function (this: { limit: typeof limitMock }, options: unknown) {
      ratelimitCtor(options);
      this.limit = limitMock;
    }),
    {
      slidingWindow: (requests: number, window: string) => ({ requests, window }),
    },
  ),
}));

const NOW = new Date("2026-09-26T00:00:00Z").getTime();

/**
 * 環境変数を設定したうえで rate-limit モジュールを読み直す。
 * 接続設定はモジュール読み込み時に 1 度だけ解釈される設計のため、ケースごとに読み直す必要がある。
 * @param configured Upstash の環境変数を揃えるか
 * @returns 読み直した `enforceRateLimit`
 */
const loadEnforceRateLimit = async (configured: boolean) => {
  vi.resetModules();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", configured ? "https://example.upstash.io" : "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", configured ? "upstash-token" : "");
  const { enforceRateLimit } = await import("../rate-limit");
  return enforceRateLimit;
};

beforeEach(() => {
  limitMock.mockReset();
  ratelimitCtor.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("enforceRateLimit", () => {
  // --- 正常系 ---

  it("上限内なら通し、送信元の識別子でカウントする", async () => {
    const enforceRateLimit = await loadEnforceRateLimit(true);
    limitMock.mockResolvedValue({ success: true, reset: NOW + 60_000 });

    await expect(enforceRateLimit("auth-admin", "203.0.113.1")).resolves.toEqual({ ok: true });
    expect(limitMock).toHaveBeenCalledWith("203.0.113.1");
  });

  it("保護対象ごとに別のカウンタ（prefix）と制限値で作る", async () => {
    await loadEnforceRateLimit(true);

    expect(ratelimitCtor).toHaveBeenCalledTimes(3);
    const options = ratelimitCtor.mock.calls.map(([option]) => option);
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          prefix: "ratelimit:auth-admin",
          limiter: { requests: 20, window: "60 s" },
        }),
        expect.objectContaining({
          prefix: "ratelimit:videos-write",
          limiter: { requests: 30, window: "60 s" },
        }),
        expect.objectContaining({
          prefix: "ratelimit:openapi",
          limiter: { requests: 10, window: "60 s" },
        }),
      ]),
    );
  });

  // --- 準正常系（上限超過） ---

  it("上限超過なら 429・統一エラー本文・Retry-After（秒・切り上げ）を返す", async () => {
    const enforceRateLimit = await loadEnforceRateLimit(true);
    limitMock.mockResolvedValue({ success: false, reset: NOW + 1_500 });

    const result = await enforceRateLimit("videos-write", "203.0.113.1");
    if (result.ok) throw new Error("上限超過のはずが通過した");

    expect(result.response.status).toBe(429);
    expect(result.response.headers.get("Retry-After")).toBe("2");
    expect(await result.response.json()).toEqual({ error: RATE_LIMIT_MESSAGE });
  });

  it("reset が過去でも Retry-After は最低 1 秒（0 は「すぐ再試行してよい」の意味になるため）", async () => {
    const enforceRateLimit = await loadEnforceRateLimit(true);
    limitMock.mockResolvedValue({ success: false, reset: NOW - 5_000 });

    const result = await enforceRateLimit("openapi", "203.0.113.1");
    if (result.ok) throw new Error("上限超過のはずが通過した");

    expect(result.response.headers.get("Retry-After")).toBe("1");
  });

  it("環境変数が未設定なら無効化して通し、Upstash を使わない", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const enforceRateLimit = await loadEnforceRateLimit(false);

    await expect(enforceRateLimit("auth-admin", "203.0.113.1")).resolves.toEqual({ ok: true });
    expect(ratelimitCtor).not.toHaveBeenCalled();
    expect(limitMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[rate-limit] disabled"));
  });

  it("無効化の警告は 1 度だけ出す（毎回出すとログが埋まる）", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const enforceRateLimit = await loadEnforceRateLimit(false);

    await enforceRateLimit("auth-admin", "203.0.113.1");
    await enforceRateLimit("videos-write", "203.0.113.1");

    expect(warn).toHaveBeenCalledTimes(1);
  });

  // --- 異常系（Upstash 障害） ---

  it("Upstash への問い合わせが失敗しても通す（レートリミットの障害で操作を止めない）", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const enforceRateLimit = await loadEnforceRateLimit(true);
    limitMock.mockRejectedValue(new Error("upstash unavailable"));

    await expect(enforceRateLimit("auth-admin", "203.0.113.1")).resolves.toEqual({ ok: true });
    expect(error).toHaveBeenCalledWith("[rate-limit] check failed", expect.any(Error));
  });
});
