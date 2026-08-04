import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * JSON ボディ読み取りの結果。
 * `requireAdmin`（`lib/auth-server.ts`）と同じ形にそろえ、失敗時は呼び出し側でそのまま返せる
 * `response` を持たせる。
 */
type ReadJsonBodyResult =
  /** 解析成功。`body` は未検証のため、必ず Zod スキーマで検証してから使う */
  | { ok: true; body: unknown }
  /** 解析失敗。400 のレスポンスをそのまま返す */
  | { ok: false; response: NextResponse };

/**
 * リクエストの JSON ボディを読み取る。解析失敗（壊れた JSON・空ボディ）は 400 として扱う。
 * 解析エラーだけを狭く捕捉するのが要点で、広い try/catch の中で `request.json()` を呼ぶと
 * DB などの内部例外と区別できず 500 に丸まってしまう。壊れた JSON はクライアント側で直せる
 * 入力エラーであり、サーバー障害（5xx）ではない。
 * @param request 読み取り対象のリクエスト
 * @returns 成功なら `{ ok: true, body }`、失敗なら 400 の `response` を含む結果
 */
export const readJsonBody = async (request: NextRequest): Promise<ReadJsonBodyResult> => {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    // 内部メッセージ（SyntaxError の詳細）は返さない（error-handling.md）。
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
};
