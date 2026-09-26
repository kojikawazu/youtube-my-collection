import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { fetchIsAdmin } from "../auth";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // 通信失敗の異常系で console.error が呼ばれるため、テスト出力を汚さないよう黙らせる。
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("fetchIsAdmin", () => {
  // --- 正常系 ---

  it("isAdmin=true なら admin を返し、Bearer トークンを付けて送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isAdmin: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchIsAdmin("token-1")).resolves.toBe("admin");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/admin", {
      method: "GET",
      headers: { Authorization: "Bearer token-1" },
    });
  });

  // --- 準正常系（管理者でないことを表す応答） ---

  it("isAdmin=false なら denied を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isAdmin: false }) }),
    );

    await expect(fetchIsAdmin("token-1")).resolves.toBe("denied");
  });

  it("isAdmin フィールドが無ければ denied を返す（安全側に倒す）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    await expect(fetchIsAdmin("token-1")).resolves.toBe("denied");
  });

  it("401 なら denied を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    await expect(fetchIsAdmin("token-1")).resolves.toBe("denied");
  });

  it("429 なら rate-limited を返す（denied に混ぜず、管理者を誤って拒否させない）", async () => {
    const json = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json }));

    await expect(fetchIsAdmin("token-1")).resolves.toBe("rate-limited");
    // 429 の本文は判定に使わない（管理者かどうかはサーバーも判定していない）。
    expect(json).not.toHaveBeenCalled();
  });

  it("403 は rate-limited ではなく denied を返す（429 以外の失敗は従来どおり）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }),
    );

    await expect(fetchIsAdmin("token-1")).resolves.toBe("denied");
  });

  // --- 異常系（通信そのものが失敗する） ---

  it("fetch が throw しても denied を返す（例外を呼び出し側へ伝播させない）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchIsAdmin("token-1")).resolves.toBe("denied");
  });

  it("JSON の解析に失敗しても denied を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("invalid json");
        },
      }),
    );

    await expect(fetchIsAdmin("token-1")).resolves.toBe("denied");
  });
});
