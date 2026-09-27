import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { readJsonBody } from "../request";

/**
 * 生の文字列ボディを持つ POST リクエストを組み立てる（壊れた JSON も送れるようにする）。
 * @param raw ボディにそのまま載せる文字列（JSON として不正でもよい）
 * @returns 組み立てたリクエスト
 */
const requestWithBody = (raw: string) =>
  new NextRequest("http://localhost/api/videos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw,
  });

describe("readJsonBody", () => {
  // --- 正常系 ---

  it("正しい JSON はそのまま body として返す", async () => {
    const result = await readJsonBody(requestWithBody(JSON.stringify({ title: "動画" })));
    expect(result).toEqual({ ok: true, body: { title: "動画" } });
  });

  it("配列やスカラーも JSON として受け取る（形の検証は呼び出し側の責務）", async () => {
    const result = await readJsonBody(requestWithBody("[1,2]"));
    expect(result).toEqual({ ok: true, body: [1, 2] });
  });

  // --- 準正常系 ---

  it("壊れた JSON は 400 のレスポンスを返す", async () => {
    const result = await readJsonBody(requestWithBody("{ぐちゃぐちゃ"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");

    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("空ボディも 400 として扱う", async () => {
    const result = await readJsonBody(requestWithBody(""));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");

    expect(result.response.status).toBe(400);
  });

  // --- 異常系 ---

  it("エラーレスポンスに内部の例外メッセージを含めない", async () => {
    const result = await readJsonBody(requestWithBody("{'single':1}"));
    if (result.ok) throw new Error("unreachable");

    const body = (await result.response.json()) as { error: string };
    expect(body.error).toBe("Invalid JSON body");
    // SyntaxError の詳細（トークン名・位置情報）が漏れていないこと
    expect(body.error).not.toMatch(/token|position|Unexpected/i);
  });
});
