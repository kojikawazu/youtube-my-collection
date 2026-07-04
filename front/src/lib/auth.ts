import { supabase } from "@/lib/supabase/client";

/**
 * Google OAuth ログインを開始する。
 * リダイレクト先は `NEXT_PUBLIC_SITE_URL`（本番の固定 URL）を優先し、
 * 未設定時のみ `window.location.origin` にフォールバックする（プレビュー URL 対策）。
 * @returns Supabase の OAuth 開始結果（リダイレクト情報）を表す Promise
 */
export const signInWithGoogle = async () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectBase = siteUrl && siteUrl.length > 0 ? siteUrl : window.location.origin;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${redirectBase}/auth/callback`,
    },
  });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};
