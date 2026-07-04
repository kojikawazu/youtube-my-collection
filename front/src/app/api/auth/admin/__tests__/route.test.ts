import { describe, it, expect, vi, beforeEach } from "vitest";

// 外部 I/O（Supabase 認証）のみモック。allowlist 判定ロジックは実物を通す。
const getUserMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}));

import { GET } from "../route";

const makeRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/auth/admin", { headers });

describe("GET /api/auth/admin", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  // --- 正常系 ---

  it("管理者メールなら { isAdmin: true } を返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "admin@example.com" } }, error: null });
    const res = await GET(makeRequest({ authorization: "Bearer valid-token" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isAdmin: true });
  });

  // --- 準正常系 ---

  it("管理者メールと不一致なら { isAdmin: false }（200）", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "user@example.com" } }, error: null });
    const res = await GET(makeRequest({ authorization: "Bearer valid-token" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isAdmin: false });
  });

  it("Authorization ヘッダーが無ければ 401（トークン検証を呼ばない）", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  // --- 異常系 ---

  it("トークン検証がエラーを返せば 401", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    const res = await GET(makeRequest({ authorization: "Bearer broken" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ isAdmin: false });
  });
});
