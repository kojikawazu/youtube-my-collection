import { useEffect, useRef } from "react";
import { AUTH_ERROR_QUERY_KEY, resolveAuthErrorMessage } from "@/constants/auth";

/**
 * OAuth コールバックから引き継いだ失敗理由（`auth_error` クエリ）をトーストで表示する。
 * 表示後は URL からクエリを取り除く。残したままだとリロードや共有 URL で
 * 「今起きていないエラー」が再表示されてしまうため。
 * @param showToast 失敗メッセージを表示する関数（`useToast` の `showToast`）
 */
export function useAuthErrorToast(showToast: (message: string) => void) {
  const showToastRef = useRef(showToast);

  // 最新の showToast を ref に写す。下の効果は初回のみ実行したいので依存に入れない。
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = resolveAuthErrorMessage(params.get(AUTH_ERROR_QUERY_KEY));
    if (!message) return;

    params.delete(AUTH_ERROR_QUERY_KEY);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);

    showToastRef.current(message);
  }, []);
}
