import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectBase = siteUrl && siteUrl.length > 0 ? new URL(siteUrl) : new URL(request.url);
  if (!code) {
    return NextResponse.redirect(new URL("/", redirectBase));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL("/", redirectBase));
}
