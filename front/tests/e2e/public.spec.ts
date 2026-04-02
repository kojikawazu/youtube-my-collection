import { test, expect } from "@playwright/test";
import { baseVideos, mockVideosApi, type MockVideo } from "./helpers";

test.describe("normal flows", () => {
  test.beforeEach(async ({ page }) => {
    await mockVideosApi(page, baseVideos);
  });

  test("list renders and navigates to detail", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "コレクション" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "React 2024 完全ガイド" })).toBeVisible();

    await page.getByRole("heading", { name: "React 2024 完全ガイド" }).click();

    await expect(
      page.getByRole("heading", { name: "React 2024 完全ガイド", level: 1 })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "YouTube を開く" })).toHaveAttribute(
      "href",
      "https://youtube.com/watch?v=example2"
    );

    await page.getByRole("button", { name: "コレクションへ" }).click();
    await expect(page.getByRole("heading", { name: "コレクション" })).toBeVisible();
  });

  test("filters videos by search", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("キーワードを検索...").fill("Piano");

    await expect(page.getByRole("heading", { name: "癒しのピアノメドレー" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "React 2024 完全ガイド" })).toHaveCount(0);
  });

  test("sorts videos by rating", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("combobox").selectOption({ label: "高評価順" });

    await expect(page.locator("h3").first()).toHaveText("React 2024 完全ガイド");
  });

  test("opens login screen", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByRole("heading", { name: "管理者ログイン" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
  });
});

test("supports pagination with 10 items per page", async ({ page }) => {
  const paginationVideos: MockVideo[] = Array.from({ length: 11 }, (_, index) => ({
    id: `pg-${index + 1}`,
    title: `ページング動画 ${index + 1}`,
    youtubeUrl: `https://youtube.com/watch?v=page${index + 1}`,
    thumbnailUrl: `https://picsum.photos/seed/page-${index + 1}/640/360`,
    tags: [`Tag${index + 1}`],
    category: "プログラミング",
    rating: ((index + 2) % 5) + 1,
    addedDate: new Date(Date.UTC(2025, 0, 31 - index)).toISOString(),
    publishDate: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
    goodPoints: "good",
    memo: "memo",
  }));

  await mockVideosApi(page, paginationVideos);
  await page.goto("/");

  await expect(page.locator("h3")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "2" })).toBeVisible();

  await page.getByRole("button", { name: "2" }).click();

  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(page.locator("h3")).toHaveCount(1);
});

test("shows at most five page number buttons", async ({ page }) => {
  const paginationVideos: MockVideo[] = Array.from({ length: 61 }, (_, index) => ({
    id: `window-${index + 1}`,
    title: `ページ番号検証 ${index + 1}`,
    youtubeUrl: `https://youtube.com/watch?v=window${index + 1}`,
    thumbnailUrl: `https://picsum.photos/seed/window-${index + 1}/640/360`,
    tags: [`Window${index + 1}`],
    category: "プログラミング",
    rating: ((index + 3) % 5) + 1,
    addedDate: new Date(Date.UTC(2025, 11, 31 - index)).toISOString(),
    publishDate: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
    goodPoints: "good",
    memo: "memo",
  }));

  await mockVideosApi(page, paginationVideos);
  await page.goto("/");

  await expect(page.getByText("1 / 7")).toBeVisible();
  await expect(page.getByRole("button", { name: "1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "5" })).toBeVisible();
  await expect(page.getByRole("button", { name: "6" })).toHaveCount(0);

  await page.getByRole("button", { name: "5" }).click();

  await expect(page.getByText("5 / 7")).toBeVisible();
  await expect(page.getByRole("button", { name: "3" })).toBeVisible();
  await expect(page.getByRole("button", { name: "7" })).toBeVisible();
  await expect(page.getByRole("button", { name: "2" })).toHaveCount(0);
});

test("resets to first page when sort option changes", async ({ page }) => {
  const paginationVideos: MockVideo[] = Array.from({ length: 11 }, (_, index) => ({
    id: `sort-reset-${index + 1}`,
    title: `ソート戻り検証 ${index + 1}`,
    youtubeUrl: `https://youtube.com/watch?v=sortreset${index + 1}`,
    thumbnailUrl: `https://picsum.photos/seed/sort-reset-${index + 1}/640/360`,
    tags: [`Sort${index + 1}`],
    category: "プログラミング",
    rating: ((index + 1) % 5) + 1,
    addedDate: new Date(Date.UTC(2025, 5, 30 - index)).toISOString(),
    publishDate: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
    goodPoints: "good",
    memo: "memo",
  }));

  await mockVideosApi(page, paginationVideos);
  await page.goto("/");

  await page.getByRole("button", { name: "2" }).click();
  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(page.locator("h3")).toHaveCount(1);

  await page.getByRole("combobox").selectOption({ label: "高評価順" });

  await expect(page.getByText("1 / 2")).toBeVisible();
  await expect(page.locator("h3")).toHaveCount(10);
});

test("gracefully handles empty list", async ({ page }) => {
  await page.route("**/api/videos**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "x-total-count": "0",
        "x-limit": "10",
        "x-offset": "0",
      },
      body: JSON.stringify([]),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "コレクション" })).toBeVisible();
  await expect(page.locator("h3")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "次へ" })).toHaveCount(0);
});

test("shows unpublished label when publishDate is null", async ({ page }) => {
  const withUnpublished = [
    {
      ...baseVideos[0],
      id: "unpublished-1",
      title: "公開日未設定の動画",
      publishDate: null,
    },
  ];

  await mockVideosApi(page, withUnpublished);

  await page.goto("/");
  await page.getByRole("heading", { name: "公開日未設定の動画" }).click();

  await expect(page.getByText("公開日未設定")).toBeVisible();
});

test("shows error banner when api fails", async ({ page }) => {
  await page.route("**/api/videos**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "failed" }),
    });
  });

  await page.goto("/");

  await expect(page.getByText("データの取得に失敗しました。")).toBeVisible();
});

test("shows error banner on request timeout", async ({ page }) => {
  await page.route("**/api/videos**", async (route) => {
    await route.abort("timedout");
  });

  await page.goto("/");

  await expect(page.getByText("データの取得に失敗しました。")).toBeVisible();
});

test("does not call /api/auth/admin when not logged in", async ({ page }) => {
  await mockVideosApi(page, baseVideos);

  const adminRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/admin")) {
      adminRequests.push(req.url());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "コレクション" })).toBeVisible();

  expect(adminRequests).toHaveLength(0);
});
