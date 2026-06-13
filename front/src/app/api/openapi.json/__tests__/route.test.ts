import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// 外部 I/O（Supabase 認証）のみモックする。requireAdmin の認可ロジック自体は実物を通す。
const getUserMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}));

import { GET } from "../route";

const makeRequest = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/openapi.json", { headers });

describe("GET /api/openapi.json", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  // --- 正常系 ---

  it("管理者トークンなら OpenAPI 3.0 ドキュメントを返す", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { email: "admin@example.com" } },
      error: null,
    });

    const res = await GET(makeRequest({ authorization: "Bearer valid-token" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.openapi).toBe("3.0.0");
    expect(body.paths["/api/videos"]).toBeDefined();
  });

  // --- 準正常系（想定内の認証・認可エラー） ---

  it("Authorization ヘッダーが無ければ 401（トークン検証を呼ばない）", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("有効なトークンでも管理者メールと不一致なら 403", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { email: "intruder@example.com" } },
      error: null,
    });

    const res = await GET(makeRequest({ authorization: "Bearer valid-token" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  // --- 異常系（トークン検証そのものが失敗） ---

  it("トークン検証でエラーが返れば 403", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid token" },
    });

    const res = await GET(makeRequest({ authorization: "Bearer broken-token" }));
    expect(res.status).toBe(403);
  });
});
