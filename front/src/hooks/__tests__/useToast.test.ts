import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "../useToast";

describe("useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set message when showToast is called", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("追加しました。");
    });
    expect(result.current.toastMessage).toBe("追加しました。");
  });

  it("should clear message after 2200ms", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("追加しました。");
    });
    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(result.current.toastMessage).toBeNull();
  });

  it("should reset timer when showToast is called again", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("1回目");
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      result.current.showToast("2回目");
    });
    act(() => {
      vi.advanceTimersByTime(2199);
    });
    expect(result.current.toastMessage).toBe("2回目");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toastMessage).toBeNull();
  });

  it("should clear timer on unmount without error", () => {
    const { result, unmount } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("テスト");
    });
    unmount();
    // タイマーが残っていても例外が発生しないことを確認
    expect(() => vi.advanceTimersByTime(2200)).not.toThrow();
  });
});
