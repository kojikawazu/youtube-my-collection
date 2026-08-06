import { describe, it, expect, vi } from "vitest";

// vi.mock factory の内部では外部変数を参照できないため、vi.fn() をインラインで定義する
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

import "../client";
import { createClient } from "@supabase/supabase-js";

const mockCreateClient = vi.mocked(createClient);

describe("supabase browser client", () => {
  /**
   * createClient に渡された auth オプション（モジュール読み込み時に 1 度だけ呼ばれる）。
   * @returns 生成時に指定した auth オプション。未指定なら undefined
   */
  const authOptions = () => mockCreateClient.mock.calls[0]?.[2]?.auth;

  // --- 正常系 ---

  it("PKCE フローで生成する", () => {
    // implicit のままだと Google からは #access_token が返り、callback の
    // exchangeCodeForSession が前提とする ?code= が届かない（issue #165）。
    expect(authOptions()?.flowType).toBe("pkce");
  });

  it("URL からのセッション自動取り込みを無効にする", () => {
    // 既定の true だと callback ページで client が勝手に交換を始め、明示的な
    // exchangeCodeForSession と認可コードを奪い合う（コードは 1 回しか使えない）。
    // 同時に implicit の #access_token 取り込みも止まり、PKCE 以外の経路を塞げる。
    expect(authOptions()?.detectSessionInUrl).toBe(false);
  });
});
