import { useEffect, useRef, useState } from "react";
import { exchangeOAuthCode } from "@/lib/auth";
import { AUTH_ERROR_QUERY_KEY, type AuthErrorCode } from "@/constants/auth";

/** `useAuthCallback` の戻り値。 */
type UseAuthCallbackResult = {
  /** 交換処理が進行中かどうか。false になるのはリダイレクト直前のみ（画面はほぼ常に true） */
  isExchanging: boolean;
};

/**
 * OAuth コールバックを処理するフック。
 * URL の認可コードをセッションへ交換し、結果に関わらずトップへ置き換え遷移する
 * （失敗理由は `auth_error` クエリで渡し、トップ側でトースト表示する）。
 *
 * サーバーではなくブラウザで交換するのは、PKCE の code verifier がログイン開始時の
 * ブラウザクライアント storage にしか存在しないため（`lib/supabase/client.ts` 参照）。
 * @returns 進行状態（`isExchanging`）
 */
export function useAuthCallback(): UseAuthCallbackResult {
  const [isExchanging, setIsExchanging] = useState(true);
  // React 18 の StrictMode は effect を 2 回実行する。認可コードは 1 回しか使えないため、
  // 2 回目の交換は必ず失敗する。ref で初回のみに絞る。
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    /**
     * トップへ置き換え遷移する。履歴を残さないのは、戻るで使用済みコードの URL に戻らせないため。
     * @param authError 失敗理由。指定時のみ `auth_error` クエリを付けて画面へ伝える
     */
    const goHome = (authError?: AuthErrorCode) => {
      const target = authError ? `/?${AUTH_ERROR_QUERY_KEY}=${authError}` : "/";
      window.location.replace(target);
    };

    /** 認可コードを取り出してセッションへ交換する。失敗理由は種別ごとに分けてトップへ渡す。 */
    const run = async () => {
      const params = new URLSearchParams(window.location.search);

      // provider 側で拒否・失敗した場合は code が来ず、error 系のクエリだけが返る。
      if (params.get("error")) {
        console.error("OAuth provider returned an error:", params.get("error"));
        setIsExchanging(false);
        goHome("provider_denied");
        return;
      }

      const code = params.get("code");
      if (!code) {
        setIsExchanging(false);
        goHome("missing_code");
        return;
      }

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Auth callback failed: missing Supabase environment variables");
        setIsExchanging(false);
        goHome("auth_config_error");
        return;
      }

      try {
        const { error } = await exchangeOAuthCode(code);
        setIsExchanging(false);
        if (error) {
          console.error("Auth callback failed:", error.message);
          goHome("exchange_failed");
          return;
        }
        goHome();
      } catch (error) {
        // ネットワーク断など reject 経路。握り潰すとローディング表示のまま固まる。
        console.error("Auth callback failed:", error);
        setIsExchanging(false);
        goHome("exchange_failed");
      }
    };

    void run();
  }, []);

  return { isExchanging };
}
