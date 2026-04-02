import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConfirmModal } from "../useConfirmModal";

describe("useConfirmModal", () => {
  it("should set isOpen=true, variant=danger and correct title/message on openDeleteModal", () => {
    const { result } = renderHook(() => useConfirmModal());
    const mockFn = vi.fn();
    act(() => {
      result.current.openDeleteModal("テスト動画", mockFn);
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.config.variant).toBe("danger");
    expect(result.current.config.title).toBe("動画を削除しますか？");
    expect(result.current.config.message).toContain("テスト動画");
  });

  it("should set isOpen=true and variant=info on openSaveModal", () => {
    const { result } = renderHook(() => useConfirmModal());
    act(() => {
      result.current.openSaveModal(vi.fn());
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.config.variant).toBe("info");
  });

  it("should set isOpen=false on close", () => {
    const { result } = renderHook(() => useConfirmModal());
    act(() => {
      result.current.openDeleteModal("タイトル", vi.fn());
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("should preserve the onConfirm function reference", () => {
    const { result } = renderHook(() => useConfirmModal());
    const mockFn = vi.fn();
    act(() => {
      result.current.openDeleteModal("x", mockFn);
    });
    expect(result.current.config.onConfirm).toBe(mockFn);
  });
});
