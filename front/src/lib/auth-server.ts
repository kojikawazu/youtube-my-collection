import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RequireAdminResult = { ok: true; email: string } | { ok: false; response: NextResponse };

/** ログ出力用にメールをマスクする（`a***@example.com`）。ローカル部が 1 文字以下なら `***`。 */
const maskEmail = (value: string) => {
  if (!value) return "";
  const at = value.indexOf("@");
  if (at <= 1) return "***";
  const name = value.slice(0, at);
  const domain = value.slice(at + 1);
  return `${name[0]}***@${domain}`;
};

/**
 * API Route で管理者を要求する認可の正準。
 * Bearer トークンを Supabase で検証し、`ADMIN_EMAIL` allowlist と照合する。
 * - トークン欠落 → 401 Unauthorized（未認証）
 * - 検証失敗 / allowlist 不一致 → 403 Forbidden（認証済みだが権限なし）
 * `ok: false` の場合は呼び出し側でそのまま返せる `response` を含む。
 */
export const requireAdmin = async (
  request: NextRequest,
  context: string,
): Promise<RequireAdminResult> => {
  const authHeader = request.headers.get("authorization");
  const hasBearerPrefix = Boolean(authHeader && /^Bearer\s+/i.test(authHeader));
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";

  if (!authHeader || !token) {
    console.warn(`[${context}] auth header missing`, {
      hasAuthHeader: Boolean(authHeader),
      hasBearerPrefix,
      tokenLength: token.length,
    });
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const email = authData?.user?.email ?? "";
  const emailMatches = adminEmail ? email.toLowerCase() === adminEmail.toLowerCase() : false;

  if (authError || !adminEmail || !emailMatches) {
    console.warn(`[${context}] auth check failed`, {
      hasAuthError: Boolean(authError),
      authErrorMessage: authError?.message ?? "",
      emailMasked: maskEmail(email),
      adminEmailPresent: Boolean(adminEmail),
      emailMatches,
      tokenLength: token.length,
      hasBearerPrefix,
    });
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, email };
};
