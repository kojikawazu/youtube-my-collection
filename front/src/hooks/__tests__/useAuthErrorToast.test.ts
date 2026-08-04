import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuthErrorToast } from "../useAuthErrorToast";

describe("useAuthErrorToast", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  // --- 正常系 ---

  it("auth_error が無ければトーストを出さず URL も変えない", () => {
    const showToast = vi.fn();
    renderHook(() => useAuthErrorToast(showToast));

    expect(showToast).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("既知の auth_error をメッセージへ解決して表示する", () => {
    window.history.replaceState(null, "", "/?auth_error=provider_denied");
    const showToast = vi.fn();

    renderHook(() => useAuthErrorToast(showToast));

    expect(showToast).toHaveBeenCalledWith("ログインがキャンセルされました。");
  });

  it("表示後に auth_error を URL から取り除く（リロードで再表示させない）", () => {
    window.history.replaceState(null, "", "/?auth_error=exchange_failed");

    renderHook(() => useAuthErrorToast(vi.fn()));

    expect(window.location.search).toBe("");
  });

  it("他のクエリは残したまま auth_error だけを取り除く", () => {
    window.history.replaceState(null, "", "/?page=2&auth_error=exchange_failed");

    renderHook(() => useAuthErrorToast(vi.fn()));

    expect(window.location.search).toBe("?page=2");
  });

  // --- 準正常系 ---

  it("未知の auth_error でも無言にせず既定メッセージを表示する", () => {
    window.history.replaceState(null, "", "/?auth_error=something_new");
    const showToast = vi.fn();

    renderHook(() => useAuthErrorToast(showToast));

    expect(showToast).toHaveBeenCalledWith("ログインに失敗しました。もう一度お試しください。");
  });

  it("auth_error が空文字なら何も表示しない", () => {
    window.history.replaceState(null, "", "/?auth_error=");
    const showToast = vi.fn();

    renderHook(() => useAuthErrorToast(showToast));

    expect(showToast).not.toHaveBeenCalled();
  });
});
