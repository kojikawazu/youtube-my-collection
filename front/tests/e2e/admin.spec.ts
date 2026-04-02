import { test, expect } from "@playwright/test";
import { baseVideos, mockVideosApi, type MockVideo } from "./helpers";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Derive storage key from NEXT_PUBLIC_SUPABASE_URL so it works both locally and in CI.
// Supabase JS uses `sb-${hostname.split('.')[0]}-auth-token` as the key.
// Local:  https://tbcpytvlzuknfxbaijbg.supabase.co  → sb-tbcpytvlzuknfxbaijbg-auth-token
// CI:     http://localhost:3000                       → sb-localhost-auth-token
const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://tbcpytvlzuknfxbaijbg.supabase.co";
const _supabaseRef = new URL(_supabaseUrl).hostname.split(".")[0];
const SUPABASE_STORAGE_KEY = `sb-${_supabaseRef}-auth-token`;
const TEST_ACCESS_TOKEN = "test-admin-token";

/** Inject a fake non-expired Supabase session into localStorage before page JS runs. */
const injectAdminSession = async (page: import("@playwright/test").Page) => {
  await page.addInitScript(
    ({ key, token }: { key: string; token: string }) => {
      const fakeSession = {
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "test-refresh-token",
        user: {
          id: "test-user-id",
          aud: "authenticated",
          role: "authenticated",
          email: "admin@test.com",
          app_metadata: { provider: "google", providers: ["google"] },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      };
      localStorage.setItem(key, JSON.stringify(fakeSession));
    },
    { key: SUPABASE_STORAGE_KEY, token: TEST_ACCESS_TOKEN }
  );
};

/** Mock /api/auth/admin to respond with isAdmin value. */
const mockAdminApi = async (
  page: import("@playwright/test").Page,
  isAdmin: boolean,
  status = 200
) => {
  await page.route("**/api/auth/admin**", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ isAdmin }),
    });
  });
};

/** Mock Supabase logout endpoint so signOut() does not fail. */
const mockSupabaseLogout = async (page: import("@playwright/test").Page) => {
  await page.route("**/auth/v1/logout**", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
};

// ---------------------------------------------------------------------------
// Normal flows (N-1 ~ N-6)
// ---------------------------------------------------------------------------

test.describe("admin: normal flows", () => {
  test.beforeEach(async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminApi(page, true);
    await mockSupabaseLogout(page);
    await mockVideosApi(page, baseVideos);
  });

  test("N-1: admin badge and FAB are visible when admin session exists", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("管理者")).toBeVisible();
    // FAB: Plus button (fixed bottom-right)
    await expect(page.locator("button.fixed")).toBeVisible();
  });

  test("N-2: add video shows toast '追加しました。'", async ({ page }) => {
    const addedVideo: MockVideo = {
      ...baseVideos[0],
      id: "new-1",
      title: "新しい動画",
      youtubeUrl: "https://youtube.com/watch?v=new1",
    };

    await page.route("**/api/videos", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(addedVideo),
        });
        return;
      }
      // Fallback to GET mock (already handled by mockVideosApi, but just in case)
      await route.fallback();
    });

    await page.goto("/");

    // Open add form via FAB
    await page.locator("button.fixed").click();

    // Fill in required fields
    await page.getByPlaceholder("https://...").fill("https://youtube.com/watch?v=new1");
    await page.getByPlaceholder("印象的なタイトルを...").fill("新しい動画");

    // Click save button → opens save modal
    await page.getByRole("button", { name: "保存して更新" }).click();

    // Confirm in modal
    await page.getByRole("button", { name: "保存", exact: true }).click();

    await expect(page.getByText("追加しました。")).toBeVisible();
  });

  test("N-3: edit video shows toast '更新しました。' and detail reflects new title", async ({
    page,
  }) => {
    const updatedVideo: MockVideo = { ...baseVideos[1], title: "更新後タイトル" };

    await page.route("**/api/videos/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updatedVideo),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto("/");

    // Navigate to detail
    await page.getByRole("heading", { name: "React 2024 完全ガイド" }).click();
    await expect(page.getByRole("heading", { name: "React 2024 完全ガイド", level: 1 })).toBeVisible();

    // Click edit button
    await page.getByRole("button", { name: "編集" }).click();

    // Change title
    await page.getByPlaceholder("印象的なタイトルを...").fill("更新後タイトル");

    // Save
    await page.getByRole("button", { name: "保存して更新" }).click();
    await page.getByRole("button", { name: "保存", exact: true }).click();

    await expect(page.getByText("更新しました。")).toBeVisible();
    await expect(page.getByRole("heading", { name: "更新後タイトル", level: 1 })).toBeVisible();
  });

  test("N-4: delete video from card shows toast '削除しました。'", async ({ page }) => {
    await page.route("**/api/videos/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fallback();
    });

    await page.goto("/");

    // Click delete button on first card (stop propagation on the button)
    await page.getByRole("button", { name: "削除" }).first().click();

    // Confirm in modal
    await page.getByRole("button", { name: "削除" }).last().click();

    await expect(page.getByText("削除しました。")).toBeVisible();
  });

  test("N-5: delete video from detail navigates back to list", async ({ page }) => {
    await page.route("**/api/videos/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fallback();
    });

    await page.goto("/");

    // Navigate to detail — wait for detail heading to confirm transition completed
    await page.getByRole("heading", { name: "React 2024 完全ガイド" }).click();
    await expect(page.getByRole("heading", { name: "React 2024 完全ガイド", level: 1 })).toBeVisible();

    // Click delete on detail page
    await page.getByRole("button", { name: "削除" }).click();

    // Confirm in modal
    await page.getByRole("button", { name: "削除" }).last().click();

    await expect(page.getByRole("heading", { name: "コレクション" })).toBeVisible();
  });

  test("N-6: logout hides admin badge and FAB", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("管理者")).toBeVisible();

    // Click logout button
    await page.getByRole("button", { name: "ログアウト" }).click();

    await expect(page.getByText("管理者")).toHaveCount(0);
    await expect(page.locator("button.fixed")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "コレクション" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Semi-normal flows (S-1 ~ S-5)
// ---------------------------------------------------------------------------

test.describe("admin: semi-normal flows", () => {
  test("S-1: non-admin session shows rejection toast and no admin badge", async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminApi(page, false);
    await mockSupabaseLogout(page);
    await mockVideosApi(page, baseVideos);

    await page.goto("/");

    await expect(page.getByText("このアカウントは権限がありません。")).toBeVisible();
    await expect(page.getByText("管理者")).toHaveCount(0);
  });

  test("S-2: validation error shows errors and does not call POST", async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminApi(page, true);
    await mockVideosApi(page, baseVideos);

    const postCalls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/videos")) {
        postCalls.push(req.url());
      }
    });

    await page.goto("/");

    // Open add form
    await page.locator("button.fixed").click();

    // Click save without filling required fields
    await page.getByRole("button", { name: "保存して更新" }).click();

    // Validation errors shown — modal should NOT open, so modal "保存" button is absent
    await expect(page.getByRole("button", { name: "保存", exact: true })).toHaveCount(0);
    expect(postCalls).toHaveLength(0);
  });

  test("S-3a: add API failure shows alert and modal stays open", async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminApi(page, true);
    await mockVideosApi(page, baseVideos);

    await page.route("**/api/videos", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: "server error" }) });
        return;
      }
      await route.fallback();
    });

    await page.goto("/");

    await page.locator("button.fixed").click();
    await page.getByPlaceholder("https://...").fill("https://youtube.com/watch?v=fail");
    await page.getByPlaceholder("印象的なタイトルを...").fill("失敗テスト");
    await page.getByRole("button", { name: "保存して更新" }).click();

    const dialogPromise3a = page.waitForEvent("dialog");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const dialog3a = await dialogPromise3a;
    const alertMessage3a = dialog3a.message();
    await dialog3a.accept();

    await expect(page.getByRole("button", { name: "保存", exact: true })).toBeVisible();
    expect(alertMessage3a).toContain("保存に失敗しました。");
  });

  test("S-3b: edit API failure shows alert and modal stays open", async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminApi(page, true);
    await mockVideosApi(page, baseVideos);

    await page.route("**/api/videos/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: "server error" }) });
        return;
      }
      await route.fallback();
    });

    await page.goto("/");

    await page.getByRole("heading", { name: "React 2024 完全ガイド" }).click();
    await expect(page.getByRole("heading", { name: "React 2024 完全ガイド", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "編集" }).click();
    await page.getByPlaceholder("印象的なタイトルを...").fill("更新失敗テスト");
    await page.getByRole("button", { name: "保存して更新" }).click();

    const dialogPromise3b = page.waitForEvent("dialog");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const dialog3b = await dialogPromise3b;
    const alertMessage3b = dialog3b.message();
    await dialog3b.accept();

    await expect(page.getByRole("button", { name: "保存", exact: true })).toBeVisible();
    expect(alertMessage3b).toContain("更新に失敗しました。");
  });

  test("S-4: delete API failure shows alert and modal stays open", async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminApi(page, true);
    await mockVideosApi(page, baseVideos);

    await page.route("**/api/videos/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: "server error" }) });
        return;
      }
      await route.fallback();
    });

    await page.goto("/");

    await page.getByRole("button", { name: "削除" }).first().click();

    const dialogPromise4 = page.waitForEvent("dialog");
    await page.getByRole("button", { name: "削除" }).last().click();
    const dialog4 = await dialogPromise4;
    const alertMessage4 = dialog4.message();
    await dialog4.accept();

    await expect(page.getByRole("button", { name: "削除" }).last()).toBeVisible();
    expect(alertMessage4).toContain("削除に失敗しました。");
  });

  test("S-5: double-click confirm button sends POST only once", async ({ page }) => {
    await injectAdminSession(page);
    await mockAdminApi(page, true);
    await mockVideosApi(page, baseVideos);

    let postCount = 0;
    await page.route("**/api/videos", async (route) => {
      if (route.request().method() === "POST") {
        postCount++;
        // Delay so second click lands while first is in-flight
        await new Promise((res) => setTimeout(res, 300));
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...baseVideos[0], id: "new-1", title: "二重送信テスト" }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto("/");

    await page.locator("button.fixed").click();
    await page.getByPlaceholder("https://...").fill("https://youtube.com/watch?v=double");
    await page.getByPlaceholder("印象的なタイトルを...").fill("二重送信テスト");
    await page.getByRole("button", { name: "保存して更新" }).click();

    await page.getByRole("button", { name: "保存", exact: true }).click();
    // Modal switches label to "処理中..." and disables the button while in-flight
    await expect(page.getByRole("button", { name: "処理中..." })).toBeDisabled();

    await expect(page.getByText("追加しました。")).toBeVisible();
    expect(postCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Abnormal flows (A-1)
// ---------------------------------------------------------------------------

test("A-1: body overflow is restored after modal is cancelled", async ({ page }) => {
  await injectAdminSession(page);
  await mockAdminApi(page, true);
  await mockVideosApi(page, baseVideos);

  await page.goto("/");

  // Open delete modal
  await page.getByRole("button", { name: "削除" }).first().click();
  await expect(page.getByRole("button", { name: "削除" }).last()).toBeVisible();

  // Body overflow should be hidden while modal is open
  const overflowOpen = await page.evaluate(() => document.body.style.overflow);
  expect(overflowOpen).toBe("hidden");

  // Cancel
  await page.getByRole("button", { name: "キャンセル" }).click();

  // Body overflow should be restored
  const overflowClosed = await page.evaluate(() => document.body.style.overflow);
  expect(overflowClosed).not.toBe("hidden");
});
