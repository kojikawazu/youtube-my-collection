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

/** 送信元 IP が判別できないリクエストをまとめるバケット名。 */
const UNKNOWN_CLIENT_ID = "unknown";

/**
 * レートリミットのカウンタに使う送信元の識別子（IP アドレス）を取り出す。
 *
 * Vercel はプラットフォーム側で `x-forwarded-for` を設定し直すため、クライアントからは詐称できない。
 * 判別できない場合は `unknown` という単一のバケットに寄せる。**識別できないから制限しない、
 * にしない**のは、ヘッダーを欠落させるだけで総当たりの抜け道になるのを防ぐため。
 * @param request 受信リクエスト
 * @returns カウンタのキーに使う識別子。判別不能なら `unknown`
 */
export const resolveClientId = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  // 複数のプロキシを経由すると `client, proxy1, proxy2` と連なる。左端が元のクライアント。
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT_ID;
};
