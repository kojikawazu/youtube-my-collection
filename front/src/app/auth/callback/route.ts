import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectBase = siteUrl && siteUrl.length > 0 ? new URL(siteUrl) : new URL(request.url);
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
