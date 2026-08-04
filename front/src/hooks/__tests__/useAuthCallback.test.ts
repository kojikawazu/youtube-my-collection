import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// vi.mock factory の内部では外部変数を参照できないため、vi.fn() をインラインで定義する
vi.mock("@/lib/auth", () => ({
  exchangeOAuthCode: vi.fn(),
}));

import { useAuthCallback } from "../useAuthCallback";
import { exchangeOAuthCode } from "@/lib/auth";

const mockExchange = vi.mocked(exchangeOAuthCode);

/**
 * window.location を search 付きのスタブへ差し替え、replace の呼び出しを記録する。
 * @param search 差し替える `location.search`（例: `"?code=abc"`）
 * @returns `location.replace` のモック（遷移先の検証に使う）
 */
const stubLocation = (search: string) => {
  const replace = vi.fn();
  // jsdom の location は読み取り専用のため、テスト用にプロパティごと差し替える。
  // 型上は Location を要求されるが、このフックが触るのは search / replace のみ。
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { search, pathname: "/auth/callback", replace },
  });
  return replace;
};

describe("useAuthCallback", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // 本番では Vercel の環境変数として必ず注入される値。テスト環境には無いため、
    // 「設定あり」を既定にして、欠落ケースだけを個別テストで再現する。
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // --- 正常系 ---

  it("認可コードを交換できたらトップへ遷移し、auth_error を付けない", async () => {
    const replace = stubLocation("?code=valid-code");
    mockExchange.mockResolvedValue({ error: null } as Awaited<
      ReturnType<typeof exchangeOAuthCode>
    >);

    renderHook(() => useAuthCallback());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(mockExchange).toHaveBeenCalledWith("valid-code");
  });

  it("認可コードの交換は 1 度しか実行しない（StrictMode の二重実行対策）", async () => {
    // 認可コードは 1 回しか使えないため、2 度目の交換は必ず失敗する。
    const replace = stubLocation("?code=valid-code");
    mockExchange.mockResolvedValue({ error: null } as Awaited<
      ReturnType<typeof exchangeOAuthCode>
    >);

    const { rerender } = renderHook(() => useAuthCallback());
    rerender();

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(mockExchange).toHaveBeenCalledTimes(1);
  });

  // --- 準正常系 ---

  it("code が無ければ交換せず missing_code でトップへ戻す", async () => {
    const replace = stubLocation("");

    renderHook(() => useAuthCallback());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?auth_error=missing_code"));
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it("provider がエラーを返した場合は交換せず provider_denied でトップへ戻す", async () => {
    const replace = stubLocation("?error=access_denied");

    renderHook(() => useAuthCallback());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?auth_error=provider_denied"));
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it("交換がエラーを返したら exchange_failed でトップへ戻す", async () => {
    const replace = stubLocation("?code=expired-code");
    mockExchange.mockResolvedValue({ error: { message: "invalid grant" } } as Awaited<
      ReturnType<typeof exchangeOAuthCode>
    >);

    renderHook(() => useAuthCallback());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?auth_error=exchange_failed"));
  });

  it("Supabase の環境変数が欠けていれば交換せず auth_config_error でトップへ戻す", async () => {
    const replace = stubLocation("?code=valid-code");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    renderHook(() => useAuthCallback());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?auth_error=auth_config_error"));
    expect(mockExchange).not.toHaveBeenCalled();
  });

  // --- 異常系 ---

  it("交換が reject しても握り潰さず exchange_failed でトップへ戻す", async () => {
    // 握り潰すと「ログイン処理中」の表示のまま画面が固まる。
    const replace = stubLocation("?code=valid-code");
    mockExchange.mockRejectedValue(new Error("network down"));

    renderHook(() => useAuthCallback());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?auth_error=exchange_failed"));
  });
});
