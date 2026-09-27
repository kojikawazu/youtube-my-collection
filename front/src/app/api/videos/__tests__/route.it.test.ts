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

// 壊れた JSON を送るため、シリアライズせず生の文字列をボディにする。
const rawPostReq = (raw: string, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/videos", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw,
  });

// 同値データの並び順検証用に固定した id（昇順）。挿入順と期待順（id 降順）を意図的に逆にするため、
// ランダムな uuid ではなく固定値を使う。
const SAME_VALUE_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
  "00000000-0000-4000-8000-000000000006",
];

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

  it("同じ rating が並んでもページ 1・2 が id 降順の全順序どおりで、重複・欠落が起きない", async () => {
    // 全件を同一 rating・同一 createdAt にして、タイブレーカーが無いと順序が定まらない状態を作る。
    // id は固定値を昇順で挿入する。挿入順と期待順（id 降順）が逆になるため、
    // タイブレーカーが無い実装（挿入順で返る）ではこのテストが落ちる。
    const sameTime = new Date("2024-03-01T00:00:00.000Z");
    for (let i = 0; i < 6; i++) {
      await seedVideo({
        id: SAME_VALUE_IDS[i],
        title: `同値 ${i}`,
        rating: 3,
        createdAt: sameTime,
      });
    }

    const firstIds = (
      await (await GET(getReq("?sort=rating&order=desc&limit=3&offset=0"))).json()
    ).map((v: { id: string }) => v.id);
    const secondIds = (
      await (await GET(getReq("?sort=rating&order=desc&limit=3&offset=3"))).json()
    ).map((v: { id: string }) => v.id);

    const expected = [...SAME_VALUE_IDS].reverse();
    expect(firstIds).toEqual(expected.slice(0, 3));
    expect(secondIds).toEqual(expected.slice(3));
    // 重複なし かつ 合計 6 件＝欠落なし
    expect(new Set([...firstIds, ...secondIds]).size).toBe(6);
  });

  it("同値データでも同じリクエストを繰り返すと同じ順序になる", async () => {
    const sameTime = new Date("2024-03-01T00:00:00.000Z");
    for (let i = 0; i < 5; i++) {
      await seedVideo({
        id: SAME_VALUE_IDS[i],
        title: `再現性 ${i}`,
        rating: 4,
        createdAt: sameTime,
      });
    }

    const query = "?sort=rating&order=desc";
    const firstIds = (await (await GET(getReq(query))).json()).map((v: { id: string }) => v.id);
    const secondIds = (await (await GET(getReq(query))).json()).map((v: { id: string }) => v.id);
    const thirdIds = (await (await GET(getReq(query))).json()).map((v: { id: string }) => v.id);

    expect(secondIds).toEqual(firstIds);
    expect(thirdIds).toEqual(firstIds);
  });

  it("sort=published では publishDate 未設定（null）が order に関わらず末尾に並ぶ", async () => {
    await seedVideo({ title: "未設定", publishDate: null });
    await seedVideo({ title: "古い公開", publishDate: new Date("2024-01-01T00:00:00.000Z") });
    await seedVideo({ title: "新しい公開", publishDate: new Date("2024-06-01T00:00:00.000Z") });

    const desc = await (await GET(getReq("?sort=published&order=desc"))).json();
    expect(desc.map((v: { title: string }) => v.title)).toEqual([
      "新しい公開",
      "古い公開",
      "未設定",
    ]);

    const asc = await (await GET(getReq("?sort=published&order=asc"))).json();
    expect(asc.map((v: { title: string }) => v.title)).toEqual([
      "古い公開",
      "新しい公開",
      "未設定",
    ]);
  });

  it("publishDate が全件 null でもページ境界が id 降順で確定し、重複・欠落が起きない", async () => {
    const sameTime = new Date("2024-03-01T00:00:00.000Z");
    for (let i = 0; i < 4; i++) {
      await seedVideo({
        id: SAME_VALUE_IDS[i],
        title: `null 公開日 ${i}`,
        publishDate: null,
        createdAt: sameTime,
      });
    }

    const ids = [
      ...(await (await GET(getReq("?sort=published&order=desc&limit=2&offset=0"))).json()).map(
        (v: { id: string }) => v.id,
      ),
      ...(await (await GET(getReq("?sort=published&order=desc&limit=2&offset=2"))).json()).map(
        (v: { id: string }) => v.id,
      ),
    ];

    expect(ids).toEqual([...SAME_VALUE_IDS.slice(0, 4)].reverse());
    expect(new Set(ids).size).toBe(4);
  });

  it("order を反転すると同値データでも並びが完全な逆順になる", async () => {
    const sameTime = new Date("2024-03-01T00:00:00.000Z");
    for (let i = 0; i < 4; i++) {
      await seedVideo({
        id: SAME_VALUE_IDS[i],
        title: `逆順 ${i}`,
        rating: 2,
        createdAt: sameTime,
      });
    }

    const descIds = (await (await GET(getReq("?sort=rating&order=desc"))).json()).map(
      (v: { id: string }) => v.id,
    );
    const ascIds = (await (await GET(getReq("?sort=rating&order=asc"))).json()).map(
      (v: { id: string }) => v.id,
    );

    expect(ascIds).toEqual([...descIds].reverse());
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

  it("youtubeUrl と title だけの最小リクエストが 201 になり rating は既定の 3 で保存される", async () => {
    // API 仕様上 rating は省略可能。schema が必須にしていると、契約に適合する
    // 最小リクエストが 400 になってしまう（issue #166）。
    authAsAdmin();
    const res = await POST(
      postReq(
        { youtubeUrl: "https://youtu.be/minimal", title: "最小構成" },
        { authorization: "Bearer valid" },
      ),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).rating).toBe(3);
    expect((await prisma.videoEntry.findFirstOrThrow()).rating).toBe(3);
  });

  // --- 準正常系（認可・検証エラー） ---

  it("壊れた JSON ボディは 500 ではなく JSON 形式の 400 を返す", async () => {
    authAsAdmin();
    const res = await POST(rawPostReq("{壊れた JSON", { authorization: "Bearer valid" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("ボディ無し（空文字）も 400 を返す", async () => {
    authAsAdmin();
    const res = await POST(rawPostReq("", { authorization: "Bearer valid" }));
    expect(res.status).toBe(400);
    expect(await prisma.videoEntry.count()).toBe(0);
  });

  it("認可より先に JSON 解析させない（未認証の壊れた JSON は 401 のまま）", async () => {
    const res = await POST(rawPostReq("{壊れた JSON"));
    expect(res.status).toBe(401);
  });

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

  it("評価が下限を 1 下回る 0 なら 400 で作成しない（境界値）", async () => {
    authAsAdmin();
    const res = await POST(postReq({ ...validBody, rating: 0 }, { authorization: "Bearer ok" }));
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
