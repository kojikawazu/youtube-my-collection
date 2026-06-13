import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// 外部 I/O（Supabase セッション・/api/auth/admin への fetch）のみモックする。
// vi.mock は巻き上げられモジュール評価時に factory が走るため、参照する mock は
// vi.hoisted で初期化順を保証する。
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession: getSessionMock } },
}));

import { DocsClient } from "../DocsClient";

describe("DocsClient（管理者ガード）", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    vi.unstubAllGlobals();
  });

  // --- 正常系（ガードの主目的：未認証はドキュメントを見せずログインを促す） ---

  it("セッションが無い場合は Swagger UI を出さずログインを促す", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    render(<DocsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Google でログイン" })).toBeInTheDocument();
    });
    expect(screen.getByText(/管理者のみ閲覧できます/)).toBeInTheDocument();
  });

  // --- 準正常系（ログイン済みだが管理者でない） ---

  it("管理者でないユーザーには Swagger UI を表示しない", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "user-token" } },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isAdmin: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DocsClient />);

    await waitFor(() => {
      expect(screen.getByText(/管理者のみ閲覧できます/)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/admin", {
      headers: { Authorization: "Bearer user-token" },
    });
  });

  // --- 異常系（管理者判定 API が失敗しても安全側に倒す） ---

  it("管理者判定の fetch が失敗した場合もログイン要求にフォールバックする", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "user-token" } },
    });
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    render(<DocsClient />);

    await waitFor(() => {
      expect(screen.getByText(/管理者のみ閲覧できます/)).toBeInTheDocument();
    });
  });
});
