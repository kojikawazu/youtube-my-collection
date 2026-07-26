import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// 外部 I/O（Supabase 認証）のみモック。route の認可・部分更新・Prisma/DB は実物を通す。
const getUserMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}));

import { GET, PATCH, DELETE } from "../route";
import { seedVideo } from "@/test/it-seed";
import { prisma } from "@/lib/db";

const ADMIN = "admin@example.com";
const authAsAdmin = () =>
  getUserMock.mockResolvedValue({ data: { user: { email: ADMIN } }, error: null });

// Route Handler の第 2 引数（params は Promise）を組み立てる。
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/videos/x", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  getUserMock.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.ADMIN_EMAIL = ADMIN;
});

describe("GET /api/videos/[id] (公開・実 DB)", () => {
  it("存在する ID なら 200 でその動画を返す", async () => {
    const v = await seedVideo({ title: "対象" });
    const res = await GET(req("GET"), ctx(v.id));
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("対象");
  });

  it("UUID 形式でない ID でも 500 にせず 404 を返す", async () => {
    const res = await GET(req("GET"), ctx("not-a-uuid"));
    expect(res.status).toBe(404);
  });

  it("存在しない ID なら 404", async () => {
    const res = await GET(req("GET"), ctx("00000000-0000-0000-0000-000000000000"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/videos/[id] (管理者・実 DB)", () => {
  // --- 正常系 ---

  it("送信したフィールドだけ更新し、未送信フィールドは維持する", async () => {
    authAsAdmin();
    const v = await seedVideo({ title: "旧タイトル", rating: 3, memo: "元メモ" });
    const res = await PATCH(
      req("PATCH", { title: "新タイトル" }, { authorization: "Bearer ok" }),
      ctx(v.id),
    );
    expect(res.status).toBe(200);

    const after = await prisma.videoEntry.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.title).toBe("新タイトル");
    expect(after.rating).toBe(3); // 未送信なので不変
    expect(after.memo).toBe("元メモ");
  });

  // --- 準正常系（認可・不存在・検証） ---

  it("未認証なら 401 で更新しない", async () => {
    const v = await seedVideo({ title: "不変" });
    const res = await PATCH(req("PATCH", { title: "変更" }), ctx(v.id));
    expect(res.status).toBe(401);
    const after = await prisma.videoEntry.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.title).toBe("不変");
  });

  it("存在しない ID の更新は Prisma P2025 を 404 に変換する", async () => {
    authAsAdmin();
    const res = await PATCH(
      req("PATCH", { title: "x" }, { authorization: "Bearer ok" }),
      ctx("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });

  it("空ボディの更新は 200 で何も変更しない", async () => {
    authAsAdmin();
    const v = await seedVideo({ title: "不変", rating: 3 });
    const res = await PATCH(req("PATCH", {}, { authorization: "Bearer ok" }), ctx(v.id));
    expect(res.status).toBe(200);
    const after = await prisma.videoEntry.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.title).toBe("不変");
    expect(after.rating).toBe(3);
  });

  it("管理者メールと不一致なら 403 で更新しない", async () => {
    // 認証は通るが allowlist 外。requireAdmin が 401 と 403 を切り分けている。
    getUserMock.mockResolvedValue({ data: { user: { email: "other@example.com" } }, error: null });
    const v = await seedVideo({ title: "元" });
    const res = await PATCH(
      req("PATCH", { title: "改" }, { authorization: "Bearer ok" }),
      ctx(v.id),
    );
    expect(res.status).toBe(403);
    expect((await prisma.videoEntry.findUniqueOrThrow({ where: { id: v.id } })).title).toBe("元");
  });

  it("publishDate に不正な日付文字列を送ると未送信扱いで既存値を維持する", async () => {
    authAsAdmin();
    const v = await seedVideo({ title: "元", publishDate: new Date("2024-01-01T00:00:00.000Z") });
    const res = await PATCH(
      req("PATCH", { publishDate: "not-a-date" }, { authorization: "Bearer ok" }),
      ctx(v.id),
    );
    expect(res.status).toBe(200);
    const after = await prisma.videoEntry.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.publishDate?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("検証エラー（評価が範囲外）なら 400 で更新しない", async () => {
    authAsAdmin();
    const v = await seedVideo({ rating: 3 });
    const res = await PATCH(
      req("PATCH", { rating: 99 }, { authorization: "Bearer ok" }),
      ctx(v.id),
    );
    expect(res.status).toBe(400);
    const after = await prisma.videoEntry.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.rating).toBe(3);
  });
});

describe("DELETE /api/videos/[id] (管理者・実 DB)", () => {
  it("管理者なら 200 で削除する", async () => {
    authAsAdmin();
    const v = await seedVideo({ title: "消す" });
    const res = await DELETE(req("DELETE", {}, { authorization: "Bearer ok" }), ctx(v.id));
    expect(res.status).toBe(200);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("未認証なら 401 で削除しない", async () => {
    const v = await seedVideo({ title: "残す" });
    const res = await DELETE(req("DELETE", {}), ctx(v.id));
    expect(res.status).toBe(401);
    expect(await prisma.videoEntry.count()).toBe(1);
  });

  it("管理者メールと不一致なら 403 で削除しない", async () => {
    // 認証は通るが allowlist 外。401（未認証）ではなく 403（権限なし）に切り分けられる。
    getUserMock.mockResolvedValue({ data: { user: { email: "other@example.com" } }, error: null });
    const v = await seedVideo({ title: "残す" });
    const res = await DELETE(req("DELETE", {}, { authorization: "Bearer ok" }), ctx(v.id));
    expect(res.status).toBe(403);
    expect(await prisma.videoEntry.count()).toBe(1);
  });

  it("ADMIN_EMAIL 未設定なら誰であっても 403 で削除しない（設定ミス時に安全側へ倒す）", async () => {
    authAsAdmin();
    process.env.ADMIN_EMAIL = "";
    const v = await seedVideo({ title: "残す" });
    const res = await DELETE(req("DELETE", {}, { authorization: "Bearer ok" }), ctx(v.id));
    expect(res.status).toBe(403);
    expect(await prisma.videoEntry.count()).toBe(1);
  });

  it("トークンが無効（Supabase が検証エラー）なら 403 で削除しない", async () => {
    // 期限切れ・改ざんトークンの想定。未認証（401）ではなく権限なし（403）に切り分けられる。
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "invalid JWT" } });
    const v = await seedVideo({ title: "残す" });
    const res = await DELETE(req("DELETE", {}, { authorization: "Bearer expired" }), ctx(v.id));
    expect(res.status).toBe(403);
    expect(await prisma.videoEntry.count()).toBe(1);
  });

  it("存在しない ID の削除は Prisma P2025 を 404 に変換する", async () => {
    authAsAdmin();
    const res = await DELETE(
      req("DELETE", {}, { authorization: "Bearer ok" }),
      ctx("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });
});
