import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { fetchIsAdmin } from "@/repositories/auth";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

type UseAuthOptions = {
  showToast: (message: string) => void;
  onNonAdminRejected: () => void;
};

/**
 * 管理者セッションを管理するフック。Supabase の認証状態を購読し、
 * `/api/auth/admin` でサーバー側の allowlist 判定を行う（クライアントにメールを露出しない）。
 * allowlist 外のアカウントでログインした場合はサインアウトさせ、`onNonAdminRejected` を呼ぶ。
 * @returns 管理者判定 `isAdmin`・API 認可用 `accessToken`・`login` / `logout`
 */
export function useAuth({ showToast, onNonAdminRejected }: UseAuthOptions) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const rejectRef = useRef(false);
  const showToastRef = useRef(showToast);
  const onNonAdminRejectedRef = useRef(onNonAdminRejected);

  // 最新の showToast / onNonAdminRejected を ref に写し、下の購読 useEffect（空依存で張り直さない）から常に最新版を呼べるようにする。
  useEffect(() => {
    showToastRef.current = showToast;
    onNonAdminRejectedRef.current = onNonAdminRejected;
  }, [showToast, onNonAdminRejected]);

  useEffect(() => {
    /** allowlist 外のログインを拒否する。サインアウト→状態クリア→通知を行う（多重実行を ref でガード）。 */
    const rejectNonAdmin = async () => {
      if (rejectRef.current) return;
      rejectRef.current = true;
      try {
        await signOut();
      } catch {
        // Ignore signOut errors (e.g. expired token → 403)
      }
      setAccessToken(null);
      setIsAdmin(false);
      onNonAdminRejectedRef.current();
      showToastRef.current("このアカウントは権限がありません。");
      rejectRef.current = false;
    };

    /** 認証状態を未ログインへ戻す（トークン破棄・管理者フラグ解除）。 */
    const clearSession = () => {
      setAccessToken(null);
      setIsAdmin(false);
    };

    /**
     * セッションを検証し、allowlist 通過なら管理者として確定、外れていれば拒否処理へ回す。
     * @param session 検証対象の Supabase セッション（未ログインは null）
     */
    const applySession = async (session: Session | null) => {
      if (!session?.access_token) {
        clearSession();
        return;
      }

      const token = session.access_token;
      const isAllowed = await fetchIsAdmin(token);
      if (isAllowed) {
        setAccessToken(token);
        setIsAdmin(true);
        return;
      }

      await rejectNonAdmin();
    };

    /** マウント時に既存セッションを取得し、あれば検証する（リロード後の管理者状態復元）。 */
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        clearSession();
        return;
      }
      await applySession(data.session);
    };
    void initSession();

    // Supabase の認証イベントを購読し、サインアウト/サインイン/トークン更新に応じて状態を同期する。
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearSession();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void applySession(session);
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  /** Google OAuth ログインを開始する。 */
  const login = () => {
    signInWithGoogle();
  };

  /** サインアウトしてローカルの認証状態をクリアする（サインアウト失敗でも state 掃除は行う）。 */
  const logout = async () => {
    try {
      await signOut();
    } catch {
      // signOut failure should not block state cleanup
    }
    setAccessToken(null);
    setIsAdmin(false);
  };

  return { isAdmin, accessToken, login, logout };
}
