import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// vi.mock factory の内部では外部変数を参照できないため、vi.fn() をインラインで定義する
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));

import { useAuth } from "../useAuth";
import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth";
import { RATE_LIMIT_MESSAGE } from "@/constants/auth";

const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);
const mockSignOut = vi.mocked(signOut);

const makeSession = (token: string) => ({
  data: { session: { access_token: token } },
});

const mockAdminApi = (isAdmin: boolean, status = 200) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ isAdmin }),
    }),
  );
};

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- 正常系 ---

  it("should set isAdmin=true and accessToken when admin session exists", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("admin-token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    mockAdminApi(true);
    const showToast = vi.fn();
    const onNonAdminRejected = vi.fn();
    const { result } = renderHook(() => useAuth({ showToast, onNonAdminRejected }));
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(result.current.accessToken).toBe("admin-token");
  });

  it("should set isAdmin=false and accessToken=null when no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } } as unknown as Awaited<
      ReturnType<typeof supabase.auth.getSession>
    >);
    const { result } = renderHook(() =>
      useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }),
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
    expect(result.current.accessToken).toBeNull();
  });

  it("should clear state on SIGNED_OUT event", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    mockAdminApi(true);
    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb) => {
      authStateCallback = cb as typeof authStateCallback;
      // モックは hook が使う unsubscribe だけを実装し Subscription 全体とは構造的に
      // 重ならないため、意図的な部分モックとして unknown 経由でキャストする。
      return { data: { subscription: { unsubscribe: vi.fn() } } } as unknown as ReturnType<
        typeof supabase.auth.onAuthStateChange
      >;
    });
    const { result } = renderHook(() =>
      useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }),
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    act(() => {
      authStateCallback("SIGNED_OUT", null);
    });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  it("should clear state after logout()", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    mockAdminApi(true);
    mockSignOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() =>
      useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }),
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  // --- 準正常系 ---

  it("should call signOut, showToast, and onNonAdminRejected for non-admin session", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("non-admin-token") as unknown as Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >,
    );
    mockAdminApi(false);
    mockSignOut.mockResolvedValue({ error: null });
    const showToast = vi.fn();
    const onNonAdminRejected = vi.fn();
    renderHook(() => useAuth({ showToast, onNonAdminRejected }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("このアカウントは権限がありません。"),
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(onNonAdminRejected).toHaveBeenCalled();
  });

  it("should treat 401 from /api/auth/admin as non-admin", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    mockAdminApi(false, 401);
    mockSignOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() =>
      useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }),
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });

  it("should clear state even when signOut throws on logout()", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    mockAdminApi(true);
    mockSignOut.mockRejectedValue(new Error("signOut failed"));
    const { result } = renderHook(() =>
      useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }),
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  it("does not sign out on 429 from /api/auth/admin, but shows the rate-limit message", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    mockAdminApi(false, 429);
    const showToast = vi.fn();
    const onNonAdminRejected = vi.fn();
    const { result } = renderHook(() => useAuth({ showToast, onNonAdminRejected }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(RATE_LIMIT_MESSAGE));
    // 管理者の可能性があるため、非管理者の拒否処理（サインアウト・画面遷移）は走らせない。
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(onNonAdminRejected).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalledWith("このアカウントは権限がありません。");
    // 判定できない間は安全側（非管理者）に倒す。
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  it("drops admin state without signing out when TOKEN_REFRESHED gets 429", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    mockAdminApi(true);
    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb) => {
      authStateCallback = cb as typeof authStateCallback;
      // hook が使う unsubscribe だけを実装した部分モック（上の SIGNED_OUT のテストと同じ理由でキャスト）。
      return { data: { subscription: { unsubscribe: vi.fn() } } } as unknown as ReturnType<
        typeof supabase.auth.onAuthStateChange
      >;
    });
    const showToast = vi.fn();
    const { result } = renderHook(() => useAuth({ showToast, onNonAdminRejected: vi.fn() }));
    await waitFor(() => expect(result.current.isAdmin).toBe(true));

    mockAdminApi(false, 429);
    act(() => {
      authStateCallback("TOKEN_REFRESHED", { access_token: "refreshed-token" });
    });

    await waitFor(() => expect(result.current.isAdmin).toBe(false));
    expect(result.current.accessToken).toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(RATE_LIMIT_MESSAGE);
  });

  // --- 異常系 ---

  it("should set isAdmin=false when /api/auth/admin fetch throws", async () => {
    mockGetSession.mockResolvedValue(
      makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const { result } = renderHook(() =>
      useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }),
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });
});
