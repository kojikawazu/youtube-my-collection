import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
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
