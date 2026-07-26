import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// 外部 I/O（Supabase 認証）のみモック。route の認可・検証配線・Prisma/DB は実物を通す。
const getUserMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}));

import { GET, POST } from "../route";
import { seedVideo } from "@/test/it-seed";
import { prisma } from "@/lib/db";

const ADMIN = "admin@example.com";

// getUser を管理者として応答させ、requireAdmin を通過させる。
const authAsAdmin = () =>
  getUserMock.mockResolvedValue({ data: { user: { email: ADMIN } }, error: null });

const getReq = (qs = "") => new NextRequest(`http://localhost/api/videos${qs}`);
const postReq = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/videos", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const validBody = {
  youtubeUrl: "https://youtu.be/newvideo",
  title: "新しい動画",
  thumbnailUrl: "https://img.youtube.com/vi/newvideo/hqdefault.jpg",
  tags: ["react"],
  category: "プログラミング",
  rating: 4,
  goodPoints: "良い",
  memo: "メモ",
  publishDate: null,
};

beforeEach(() => {
  getUserMock.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.ADMIN_EMAIL = ADMIN;
});

describe("GET /api/videos (公開・実 DB)", () => {
  // --- 正常系 ---

  it("空 DB では空配列と x-total-count=0 を返す", async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(res.headers.get("x-total-count")).toBe("0");
  });

  it("seed した動画を API 形（addedDate 付き）で返す", async () => {
    await seedVideo({ title: "唯一の動画", rating: 5 });
    const res = await GET(getReq());
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("唯一の動画");
    expect(body[0].rating).toBe(5);
    // toVideoItem が createdAt を ISO 文字列の addedDate へ変換している
    expect(typeof body[0].addedDate).toBe("string");
    expect(body[0].publishDate).toBeNull();
  });

  it("limit/offset でページングし、x-total-count は総件数を返す", async () => {
    for (let i = 0; i < 3; i++) await seedVideo({ title: `v${i}` });
    const res = await GET(getReq("?limit=2&offset=0"));
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(res.headers.get("x-total-count")).toBe("3");
    expect(res.headers.get("x-limit")).toBe("2");
  });

  it("sort=rating&order=desc で評価の高い順に並ぶ", async () => {
    await seedVideo({ title: "low", rating: 1 });
    await seedVideo({ title: "high", rating: 5 });
    await seedVideo({ title: "mid", rating: 3 });
    const res = await GET(getReq("?sort=rating&order=desc"));
    const body = await res.json();
    expect(body.map((v: { rating: number }) => v.rating)).toEqual([5, 3, 1]);
  });

  it("q でタイトル部分一致（大文字小文字を無視）する", async () => {
    await seedVideo({ title: "React入門" });
    await seedVideo({ title: "Vue入門" });
    const res = await GET(getReq("?q=react"));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("React入門");
  });

  it("tag 絞り込みは該当タグを持つ動画だけ返す", async () => {
    await seedVideo({ title: "tagged", tags: ["nextjs"] });
    await seedVideo({ title: "untagged", tags: [] });
    const res = await GET(getReq("?tag=nextjs"));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("tagged");
  });

  // --- 準正常系 ---

  it("limit が範囲外でも max=100 にクランプして落ちない", async () => {
    await seedVideo({ title: "only" });
    const res = await GET(getReq("?limit=9999"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-limit")).toBe("100");
  });

  it("limit=0 は min=1 にクランプして 1 件だけ返す", async () => {
    await seedVideo({ title: "a" });
    await seedVideo({ title: "b" });
    const res = await GET(getReq("?limit=0"));
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it("limit が数値でなければ既定値 10 を使う", async () => {
    await seedVideo({ title: "only" });
    const res = await GET(getReq("?limit=abc"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-limit")).toBe("10");
  });

  it("offset が総件数を超えても 200 で空配列を返す（総件数は維持）", async () => {
    await seedVideo({ title: "only" });
    const res = await GET(getReq("?offset=100"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(res.headers.get("x-total-count")).toBe("1");
  });

  it("offset が負値なら min=0 にクランプして先頭から返す", async () => {
    await seedVideo({ title: "only" });
    const res = await GET(getReq("?offset=-5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it("未知の sort 値は既定（追加日順）にフォールバックする", async () => {
    await seedVideo({ title: "古い", createdAt: new Date("2024-01-01T00:00:00.000Z") });
    await seedVideo({ title: "新しい", createdAt: new Date("2024-06-01T00:00:00.000Z") });
    const res = await GET(getReq("?sort=unknown&order=desc"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].title).toBe("新しい");
  });

  it("該当のないカテゴリ絞り込みでは空配列を返す", async () => {
    await seedVideo({ category: "プログラミング" });
    const res = await GET(getReq("?category=存在しない"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("該当のないキーワードでは空配列と x-total-count=0 を返す", async () => {
    await seedVideo({ title: "TypeScript 入門" });
    const res = await GET(getReq("?q=該当なし"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(res.headers.get("x-total-count")).toBe("0");
  });
});

describe("POST /api/videos (管理者・実 DB)", () => {
  // --- 正常系 ---

  it("管理者トークンで有効な入力なら 201 で作成し DB に反映する", async () => {
    authAsAdmin();
    const res = await POST(postReq(validBody, { authorization: "Bearer valid" }));
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.title).toBe("新しい動画");

    const rows = await prisma.videoEntry.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].youtubeUrl).toBe("https://youtu.be/newvideo");
  });

  // --- 準正常系（認可・検証エラー） ---

  it("Authorization ヘッダーが無ければ 401 で作成しない", async () => {
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(401);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("管理者メールと不一致なら 403 で作成しない", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { email: "intruder@example.com" } },
      error: null,
    });
    const res = await POST(postReq(validBody, { authorization: "Bearer valid" }));
    expect(res.status).toBe(403);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("ADMIN_EMAIL 未設定なら誰であっても 403 で作成しない（設定ミス時に安全側へ倒す）", async () => {
    authAsAdmin();
    process.env.ADMIN_EMAIL = "";
    const res = await POST(postReq(validBody, { authorization: "Bearer ok" }));
    expect(res.status).toBe(403);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("トークンが無効（Supabase が検証エラー）なら 403 で作成しない", async () => {
    // 期限切れ・改ざんトークンの想定。未認証（401）ではなく権限なし（403）に切り分けられる。
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "invalid JWT" } });
    const res = await POST(postReq(validBody, { authorization: "Bearer expired" }));
    expect(res.status).toBe(403);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("タグが 1 件でも上限文字数を超えると 400 で作成しない（境界値）", async () => {
    authAsAdmin();
    const res = await POST(
      postReq({ ...validBody, tags: ["ok", "あ".repeat(11)] }, { authorization: "Bearer ok" }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("カテゴリが上限文字数を超えると 400 で作成しない（境界値）", async () => {
    authAsAdmin();
    const res = await POST(
      postReq({ ...validBody, category: "あ".repeat(11) }, { authorization: "Bearer ok" }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("youtubeUrl が空文字なら 400 で作成しない", async () => {
    authAsAdmin();
    const res = await POST(
      postReq({ ...validBody, youtubeUrl: "" }, { authorization: "Bearer ok" }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("評価が上限 5 なら作成できる（境界値）", async () => {
    authAsAdmin();
    const res = await POST(postReq({ ...validBody, rating: 5 }, { authorization: "Bearer ok" }));
    expect(res.status).toBe(201);
    expect((await prisma.videoEntry.findFirstOrThrow()).rating).toBe(5);
  });

  it("評価が上限を 1 超える 6 なら 400 で作成しない（境界値）", async () => {
    authAsAdmin();
    const res = await POST(postReq({ ...validBody, rating: 6 }, { authorization: "Bearer ok" }));
    expect(res.status).toBe(400);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("メモが上限を 1 超えると 400 で作成しない（境界値）", async () => {
    authAsAdmin();
    const res = await POST(
      postReq({ ...validBody, memo: "あ".repeat(2001) }, { authorization: "Bearer ok" }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("必須項目が欠けていれば 400 で作成しない", async () => {
    authAsAdmin();
    const res = await POST(
      postReq({ ...validBody, title: "", youtubeUrl: "" }, { authorization: "Bearer valid" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(await prisma.videoEntry.count()).toBe(0);
  });
});
