import { describe, it, expect } from "vitest";
import { buildSecurityHeaders } from "../security-headers";

const SUPABASE_URL = "https://abcdefg.supabase.co";

/**
 * 組み立てたヘッダーから CSP のディレクティブを名前で引けるようにする。
 * @param options buildSecurityHeaders に渡す環境情報
 * @returns ディレクティブ名 → ソース一覧
 */
const cspDirectives = (options: Parameters<typeof buildSecurityHeaders>[0]) => {
  const csp = buildSecurityHeaders(options).find((h) =>
    h.key.startsWith("Content-Security-Policy"),
  );
  if (!csp) throw new Error("CSP ヘッダーが無い");
  return Object.fromEntries(
    csp.value.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }),
  ) as Record<string, string[]>;
};

describe("buildSecurityHeaders", () => {
  // --- 正常系 ---

  it("CSP と 4 つのセキュリティヘッダーを返す", () => {
    const headers = buildSecurityHeaders({ isDev: false, supabaseUrl: SUPABASE_URL });
    expect(headers.map((h) => h.key)).toEqual([
      "Content-Security-Policy-Report-Only",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
    expect(Object.fromEntries(headers.map((h) => [h.key, h.value]))).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
  });

  it("Supabase のオリジンを connect-src に入れる（認証の通信を止めない）", () => {
    expect(cspDirectives({ isDev: false, supabaseUrl: SUPABASE_URL })["connect-src"]).toEqual([
      "'self'",
      SUPABASE_URL,
    ]);
  });

  it("Swagger UI の CDN を script-src と style-src に入れる（/docs を壊さない）", () => {
    const directives = cspDirectives({ isDev: false, supabaseUrl: SUPABASE_URL });
    expect(directives["script-src"]).toContain("https://cdn.jsdelivr.net");
    expect(directives["style-src"]).toContain("https://cdn.jsdelivr.net");
  });

  it("埋め込み・プラグイン・base の差し替えを禁止する", () => {
    const directives = cspDirectives({ isDev: false, supabaseUrl: SUPABASE_URL });
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
  });

  // --- 準正常系（環境による差） ---

  it("本番では 'unsafe-eval' を許可しない", () => {
    expect(cspDirectives({ isDev: false, supabaseUrl: SUPABASE_URL })["script-src"]).not.toContain(
      "'unsafe-eval'",
    );
  });

  it("dev サーバーでは React の dev モードのため 'unsafe-eval' を許可する", () => {
    expect(cspDirectives({ isDev: true, supabaseUrl: SUPABASE_URL })["script-src"]).toContain(
      "'unsafe-eval'",
    );
  });

  it("Supabase の URL にパスが付いていてもオリジンだけを使う", () => {
    expect(
      cspDirectives({ isDev: false, supabaseUrl: `${SUPABASE_URL}/rest/v1` })["connect-src"],
    ).toEqual(["'self'", SUPABASE_URL]);
  });

  // --- 異常系（設定不備） ---

  it("Supabase の URL が未設定なら connect-src は 'self' だけ（空のソースを混ぜない）", () => {
    expect(cspDirectives({ isDev: false, supabaseUrl: undefined })["connect-src"]).toEqual([
      "'self'",
    ]);
  });

  it("Supabase の URL が不正なら無視して 'self' だけにする（ヘッダーを壊さない）", () => {
    expect(cspDirectives({ isDev: false, supabaseUrl: "not a url" })["connect-src"]).toEqual([
      "'self'",
    ]);
  });
});
