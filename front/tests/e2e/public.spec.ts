import { test, expect } from "@playwright/test";

const mockVideos = [
  {
    id: "1",
    title: "モダンなUIデザインの原則",
    youtubeUrl: "https://youtube.com/watch?v=example1",
    thumbnailUrl: "https://picsum.photos/seed/ui/640/360",
    tags: ["UI", "UX", "Design"],
    category: "デザイン",
    rating: 3,
    addedDate: "2023-11-01T10:00:00Z",
    publishDate: "2024-01-01T00:00:00Z",
    goodPoints: "### ポイント\n- 視覚的階層の作り方が分かりやすい",
    memo: "ポートフォリオ制作の参考にする。",
  },
  {
    id: "2",
    title: "React 2024 完全ガイド",
    youtubeUrl: "https://youtube.com/watch?v=example2",
    thumbnailUrl: "https://picsum.photos/seed/react/640/360",
    tags: ["React", "TypeScript", "Frontend"],
    category: "プログラミング",
    rating: 5,
    addedDate: "2023-10-25T15:00:00Z",
    publishDate: "2023-12-15T00:00:00Z",
    goodPoints: "### 学習内容\n- 新しいHooksの使い道",
    memo: "週末にハンズオンを行う。",
  },
  {
    id: "3",
    title: "癒しのピアノメドレー",
    youtubeUrl: "https://youtube.com/watch?v=example3",
    thumbnailUrl: "https://picsum.photos/seed/piano/640/360",
    tags: ["BGM", "Piano", "Relax"],
    category: "音楽",
    rating: 2,
    addedDate: "2023-11-10T08:30:00Z",
    publishDate: "2024-02-01T00:00:00Z",
    goodPoints: "### 感想\n- 音質が非常に良い",
    memo: "読書中によく聴いている。",
  },
  {
    id: "4",
    title: "究極のスパイスカレーの作り方",
    youtubeUrl: "https://youtube.com/watch?v=example4",
    thumbnailUrl: "https://picsum.photos/seed/curry/640/360",
    tags: ["Cooking", "Spicy", "Health"],
    category: "料理",
    rating: 4,
    addedDate: "2023-09-01T12:00:00Z",
    publishDate: "2023-10-01T00:00:00Z",
    goodPoints: "### コツ\n- 玉ねぎを炒める時間",
    memo: "今度のキャンプで作る。",
  },
];

test.describe("normal flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/videos**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockVideos),
      });
    });
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

    const firstTitle = await page.locator("h3").first().innerText();
    expect(firstTitle).toBe("React 2024 完全ガイド");
  });

  test("opens login screen", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByRole("heading", { name: "管理者ログイン" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
  });
});

test("gracefully handles empty list", async ({ page }) => {
  await page.route("**/api/videos**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "コレクション" })).toBeVisible();
  await expect(page.locator("h3")).toHaveCount(0);
});

test("shows unpublished label when publishDate is null", async ({ page }) => {
  const withUnpublished = [
    {
      ...mockVideos[0],
      id: "unpublished-1",
      title: "公開日未設定の動画",
      publishDate: null,
    },
  ];

  await page.route("**/api/videos**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withUnpublished),
    });
  });

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
