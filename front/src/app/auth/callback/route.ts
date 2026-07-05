import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Google OAuth のコールバック。認可コードをセッションへ交換し、トップ（/）へリダイレクトする。
 * 失敗理由は auth_error クエリで切り分ける（code 欠如=missing_code / 環境変数欠如=auth_config_error / 交換失敗=exchange_failed）。
 * @param request 認可コード（code クエリ）を含むコールバックリクエスト
 * @returns トップへのリダイレクトレスポンス（失敗時は auth_error 付き）
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectBase = siteUrl && siteUrl.length > 0 ? new URL(siteUrl) : new URL(request.url);
  // トップ(/)へのリダイレクトを組み立てる。基底は NEXT_PUBLIC_SITE_URL 優先・無ければリクエスト URL。authError 指定時のみ auth_error クエリを付与。
  const buildRedirect = (authError?: string) => {
    const redirectUrl = new URL("/", redirectBase);
    if (authError) {
      redirectUrl.searchParams.set("auth_error", authError);
    }
    return NextResponse.redirect(redirectUrl);
  };

  if (!code) {
    return buildRedirect("missing_code");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Auth callback failed: missing Supabase environment variables");
    return buildRedirect("auth_config_error");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback failed:", error.message);
    return buildRedirect("exchange_failed");
  }

  return buildRedirect();
}
