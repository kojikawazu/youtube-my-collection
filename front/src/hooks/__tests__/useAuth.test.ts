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
    })
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
    mockGetSession.mockResolvedValue(makeSession("admin-token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    mockAdminApi(true);
    const showToast = vi.fn();
    const onNonAdminRejected = vi.fn();
    const { result } = renderHook(() => useAuth({ showToast, onNonAdminRejected }));
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(result.current.accessToken).toBe("admin-token");
  });

  it("should set isAdmin=false and accessToken=null when no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    const { result } = renderHook(() => useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }));
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
    expect(result.current.accessToken).toBeNull();
  });

  it("should clear state on SIGNED_OUT event", async () => {
    mockGetSession.mockResolvedValue(makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    mockAdminApi(true);
    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb) => {
      authStateCallback = cb as typeof authStateCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as ReturnType<typeof supabase.auth.onAuthStateChange>;
    });
    const { result } = renderHook(() => useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }));
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    act(() => { authStateCallback("SIGNED_OUT", null); });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  it("should clear state after logout()", async () => {
    mockGetSession.mockResolvedValue(makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    mockAdminApi(true);
    mockSignOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }));
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  // --- 準正常系 ---

  it("should call signOut, showToast, and onNonAdminRejected for non-admin session", async () => {
    mockGetSession.mockResolvedValue(makeSession("non-admin-token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    mockAdminApi(false);
    mockSignOut.mockResolvedValue({ error: null });
    const showToast = vi.fn();
    const onNonAdminRejected = vi.fn();
    renderHook(() => useAuth({ showToast, onNonAdminRejected }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("このアカウントは権限がありません。"));
    expect(mockSignOut).toHaveBeenCalled();
    expect(onNonAdminRejected).toHaveBeenCalled();
  });

  it("should treat 401 from /api/auth/admin as non-admin", async () => {
    mockGetSession.mockResolvedValue(makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    mockAdminApi(false, 401);
    mockSignOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }));
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });

  it("should clear state even when signOut throws on logout()", async () => {
    mockGetSession.mockResolvedValue(makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    mockAdminApi(true);
    mockSignOut.mockRejectedValue(new Error("signOut failed"));
    const { result } = renderHook(() => useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }));
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  // --- 異常系 ---

  it("should set isAdmin=false when /api/auth/admin fetch throws", async () => {
    mockGetSession.mockResolvedValue(makeSession("token") as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const { result } = renderHook(() => useAuth({ showToast: vi.fn(), onNonAdminRejected: vi.fn() }));
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });
});
