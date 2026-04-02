import type { Page, Route } from "@playwright/test";

export type MockVideo = {
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

export const baseVideos: MockVideo[] = [
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

export const buildApiResponse = (dataset: MockVideo[], route: Route) => {
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

export const mockVideosApi = async (page: Page, dataset: MockVideo[]) => {
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
