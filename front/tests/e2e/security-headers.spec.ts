import { test, expect, type Page } from "@playwright/test";
import { baseVideos } from "./helpers";
import { seedVideos, disconnectDb } from "./db";

// セキュリティヘッダー（issue #192）の E2E。
// CSP（強制モード）の違反時に発火する `securitypolicyviolation` イベントを集め、0 件であることを確かめる。
// 強制モードでは違反＝リソースのブロックなので、この検査は「CSP で画面が壊れていない」ことの回帰テストになる。
// 注意: E2E は dev サーバーで動くため、ここで検証するのは dev 用のポリシー（'unsafe-eval' を含む）。
// 本番ポリシーの観測記録は docs/06-security-specification.md「CSP の観測記録」を参照。

/** ブラウザ側で収集する CSP 違反 1 件。 */
type CspViolation = {
  /** 違反したディレクティブ（例: `script-src-elem`） */
  directive: string;
  /** ブロック対象（本来は読み込もうとした URL。インラインなら `inline`） */
  blockedUri: string;
};

/** 収集先としてブラウザの window に生やす配列の名前。 */
const VIOLATIONS_KEY = "__cspViolations";

/**
 * ページのスクリプトより先に CSP 違反の収集を始める。
 * @param page Playwright のページ
 */
const collectCspViolations = async (page: Page) => {
  await page.addInitScript((key) => {
    // テスト用の収集口を window に生やす。型定義を足すほどの対象ではないため、この場だけで扱う。
    const store: CspViolation[] = [];
    (window as unknown as Record<string, CspViolation[]>)[key] = store;
    document.addEventListener("securitypolicyviolation", (event) => {
      store.push({ directive: event.violatedDirective, blockedUri: event.blockedURI });
    });
  }, VIOLATIONS_KEY);
};

/**
 * これまでに収集した CSP 違反を取り出す。
 * @param page Playwright のページ
 * @returns 違反の一覧（0 件なら空配列）
 */
const readCspViolations = (page: Page) =>
  page.evaluate(
    (key) => (window as unknown as Record<string, CspViolation[]>)[key] ?? [],
    VIOLATIONS_KEY,
  );

test.afterAll(async () => {
  await disconnectDb();
});

test.describe("security headers", () => {
  test.beforeEach(async () => {
    await seedVideos(baseVideos);
  });

  // --- 正常系 ---

  test("responds with an enforced CSP and the four security headers", async ({ page }) => {
    const response = await page.goto("/");
    if (!response) throw new Error("トップページの応答が無い");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    // 観測モードのヘッダーが残っていない（強制と二重に送らない）。
    expect(headers["content-security-policy-report-only"]).toBeUndefined();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
  });

  test("API responses also carry the security headers", async ({ request }) => {
    const response = await request.get("/api/videos?limit=1");
    expect(response.status()).toBe(200);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["content-security-policy"]).toBeDefined();
  });

  // --- 準正常系（CSP 違反の観測） ---

  test("public flows cause no CSP violations (list → detail → login)", async ({ page }) => {
    await collectCspViolations(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "React 2024 完全ガイド" })).toBeVisible();
    await page.getByRole("button", { name: "React 2024 完全ガイド" }).click();
    await expect(
      page.getByRole("heading", { name: "React 2024 完全ガイド", level: 1 }),
    ).toBeVisible();
    await page.getByRole("button", { name: "コレクションへ" }).click();
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();

    expect(await readCspViolations(page)).toEqual([]);
  });

  test("the API docs page (unauthorized view) causes no CSP violations", async ({ page }) => {
    await collectCspViolations(page);

    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: "API ドキュメント" })).toBeVisible();

    expect(await readCspViolations(page)).toEqual([]);
  });
});
