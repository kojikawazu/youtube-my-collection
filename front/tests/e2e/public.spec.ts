import { test, expect, type Page, type Route } from "@playwright/test";

type MockVideo = {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  tags: string[];
  category: string;
  rating: number;
  addedDate: string;
  publishDate: string | null;
  goodPoints: string;
  memo: string;
};

const baseVideos: MockVideo[] = [
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

const parseNumber = (
  value: string | null,
  fallback: number,
  range: { min?: number; max?: number } = {}
) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const integer = Math.trunc(parsed);
  if (typeof range.min === "number" && integer < range.min) return range.min;
  if (typeof range.max === "number" && integer > range.max) return range.max;
  return integer;
};

const toTimestamp = (value: string | null) => (value ? new Date(value).getTime() : 0);

const buildApiResponse = (dataset: MockVideo[], route: Route) => {
  const requestUrl = new URL(route.request().url());
  const sort = requestUrl.searchParams.get("sort") ?? "added";
  const order = requestUrl.searchParams.get("order") === "asc" ? "asc" : "desc";
  const q = (requestUrl.searchParams.get("q") ?? "").trim();
  const tag = requestUrl.searchParams.get("tag");
  const category = requestUrl.searchParams.get("category");
  const limit = parseNumber(requestUrl.searchParams.get("limit"), 10, { min: 1, max: 100 });
  const offset = parseNumber(requestUrl.searchParams.get("offset"), 0, { min: 0 });

  const direction = order === "asc" ? 1 : -1;
  const filtered = dataset
    .filter((video) => {
      if (tag && !video.tags.includes(tag)) return false;
      if (category && video.category !== category) return false;
      if (!q) return true;
      const inTitle = video.title.toLowerCase().includes(q.toLowerCase());
      const inTags = video.tags.some((item) => item === q);
      return inTitle || inTags;
    })
    .sort((a, b) => {
      const compare =
        sort === "rating"
          ? a.rating - b.rating
          : sort === "published"
          ? toTimestamp(a.publishDate) - toTimestamp(b.publishDate)
          : toTimestamp(a.addedDate) - toTimestamp(b.addedDate);
      return compare * direction;
    });

  const paged = filtered.slice(offset, offset + limit);
  return {
    body: JSON.stringify(paged),
    totalCount: filtered.length,
    limit,
    offset,
  };
};

const mockVideosApi = async (page: Page, dataset: MockVideo[]) => {
  await page.route("**/api/videos**", async (route) => {
    const payload = buildApiResponse(dataset, route);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "x-total-count": String(payload.totalCount),
        "x-limit": String(payload.limit),
        "x-offset": String(payload.offset),
      },
      body: payload.body,
    });
  });
};

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
