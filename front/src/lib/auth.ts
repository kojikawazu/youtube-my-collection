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

/**
 * OAuth の認可コードをセッションへ交換する（PKCE）。
 * 交換は**ログイン開始と同じブラウザクライアント**で行う必要がある。code verifier は
 * 開始時にこのクライアントの storage へ保存されており、別インスタンス（サーバー側で
 * 新規生成した client 等）からは参照できないため。
 * @param code コールバック URL の `code` クエリで受け取った認可コード
 * @returns 交換結果（成功時は session を含む）を表す Promise
 */
export const exchangeOAuthCode = async (code: string) => {
  return supabase.auth.exchangeCodeForSession(code);
};

/**
 * 現在のセッションをサインアウトする。
 * @returns Supabase のサインアウト結果を表す Promise
 */
export const signOut = async () => {
  return supabase.auth.signOut();
};
