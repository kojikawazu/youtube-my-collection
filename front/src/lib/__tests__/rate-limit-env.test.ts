import { describe, it, expect } from "vitest";
import { assertRateLimitConfiguredForProduction, resolveUpstashConfig } from "../rate-limit-env";

const URL_VALUE = "https://example.upstash.io";
const TOKEN_VALUE = "upstash-token";

describe("resolveUpstashConfig", () => {
  // --- 正常系 ---

  it("URL とトークンが揃っていれば接続設定を返す", () => {
    expect(
      resolveUpstashConfig({
        UPSTASH_REDIS_REST_URL: URL_VALUE,
        UPSTASH_REDIS_REST_TOKEN: TOKEN_VALUE,
      }),
    ).toEqual({ url: URL_VALUE, token: TOKEN_VALUE });
  });

  // --- 準正常系 ---

  it("トークンが無ければ null（片方だけでは接続できない）", () => {
    expect(resolveUpstashConfig({ UPSTASH_REDIS_REST_URL: URL_VALUE })).toBeNull();
  });

  it("URL が無ければ null", () => {
    expect(resolveUpstashConfig({ UPSTASH_REDIS_REST_TOKEN: TOKEN_VALUE })).toBeNull();
  });

  it("空白だけの値は未設定として扱う（Vercel の入力ミスで空白が入った場合）", () => {
    expect(
      resolveUpstashConfig({ UPSTASH_REDIS_REST_URL: "  ", UPSTASH_REDIS_REST_TOKEN: TOKEN_VALUE }),
    ).toBeNull();
  });
});

describe("assertRateLimitConfiguredForProduction", () => {
  // --- 正常系 ---

  it("本番でも設定が揃っていれば通る", () => {
    expect(() =>
      assertRateLimitConfiguredForProduction({
        VERCEL_ENV: "production",
        UPSTASH_REDIS_REST_URL: URL_VALUE,
        UPSTASH_REDIS_REST_TOKEN: TOKEN_VALUE,
      }),
    ).not.toThrow();
  });

  it("Preview では未設定でも通す（無効化して動かす）", () => {
    expect(() => assertRateLimitConfiguredForProduction({ VERCEL_ENV: "preview" })).not.toThrow();
  });

  it("VERCEL_ENV が無い（ローカル・CI）なら未設定でも通す", () => {
    expect(() => assertRateLimitConfiguredForProduction({})).not.toThrow();
  });

  // --- 異常系（本番の設定漏れ） ---

  it("本番で未設定ならビルドを止める", () => {
    expect(() => assertRateLimitConfiguredForProduction({ VERCEL_ENV: "production" })).toThrow(
      /UPSTASH_REDIS_REST_URL と UPSTASH_REDIS_REST_TOKEN/,
    );
  });

  it("本番でトークンだけ漏れていても止める（片方の設定では無効になるため）", () => {
    expect(() =>
      assertRateLimitConfiguredForProduction({
        VERCEL_ENV: "production",
        UPSTASH_REDIS_REST_URL: URL_VALUE,
      }),
    ).toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });
});
