import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveClientId } from "@/lib/request";

/**
 * ログイン中のユーザーが管理者かをサーバー側で判定して `{ isAdmin }` を返す。
 * allowlist（`ADMIN_EMAIL`）との照合をサーバーに閉じ、管理者メールをクライアントへ露出させない。
 * トークン欠落 / 検証失敗は 401。
 * レートリミットはトークン検証より前に判定する。でたらめなトークンでも Supabase への
 * 検証呼び出し（外部 API）を誘発できるため、その回数自体を制限するのが目的。
 * @param request 判定対象のリクエスト（Authorization ヘッダーの Bearer を参照）
 * @returns 管理者判定 `{ isAdmin }` の JSON。未認証・検証失敗は 401、レートリミット超過は 429
 */
export async function GET(request: Request) {
  const limit = await enforceRateLimit("auth-admin", resolveClientId(request));
  if (!limit.ok) return limit.response;

  const authHeader = request.headers.get("authorization");
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";

  if (!authHeader || !token) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const email = data.user.email ?? "";
  const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase();

  return NextResponse.json({ isAdmin });
}
