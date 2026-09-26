import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// 外部 I/O（Supabase のセッション取得と /api/auth/admin への通信）のみモックする。
vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { useDocsPage } from "../useDocsPage";
import { supabase } from "@/lib/supabase/client";

const mockGetSession = vi.mocked(supabase.auth.getSession);

/**
 * セッションの有無を設定する。hook が参照するのは `access_token` だけなので、その部分だけを持つ。
 * @param token アクセストークン（未ログインは null）
 */
const givenSession = (token: string | null) => {
  // Session 型の他フィールドは hook が使わないため、意図的な部分モックとして unknown 経由でキャストする。
  mockGetSession.mockResolvedValue({
    data: { session: token ? { access_token: token } : null },
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
};

/**
 * `/api/auth/admin` の応答を固定する。
 * @param status HTTP ステータス
 * @param isAdmin 本文の判定結果
 */
const givenAdminApi = (status: number, isAdmin = false) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ isAdmin }),
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDocsPage", () => {
  // --- 準正常系（管理者判定を通らない） ---

  it("未ログインなら unauthorized（管理者判定 API を呼ばない）", async () => {
    givenSession(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDocsPage());

    await waitFor(() => expect(result.current.status).toBe("unauthorized"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("非管理者なら unauthorized（ログイン誘導を出す）", async () => {
    givenSession("token");
    givenAdminApi(200, false);

    const { result } = renderHook(() => useDocsPage());

    await waitFor(() => expect(result.current.status).toBe("unauthorized"));
  });

  it("管理者判定が 429 なら unauthorized ではなく rate-limited（権限不足と誤解させない）", async () => {
    givenSession("token");
    givenAdminApi(429);

    const { result } = renderHook(() => useDocsPage());

    await waitFor(() => expect(result.current.status).toBe("rate-limited"));
  });
});
