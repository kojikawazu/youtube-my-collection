/** OAuth 失敗理由を画面へ伝えるクエリパラメータ名。callback → トップ間の受け渡しに使う。 */
export const AUTH_ERROR_QUERY_KEY = "auth_error";

/**
 * OAuth コールバックの失敗理由と、利用者へ表示する文言の対応。
 * キーが `auth_error` クエリの値になる（union の元になるためここで型も導出する）。
 * 内部原因（設定不備・交換失敗）は利用者が対処できないため、文言は再試行を促す形に揃える。
 */
export const AUTH_ERROR_MESSAGES = {
  /** 認可コードが URL に無い（直接アクセス・リダイレクト設定ミス） */
  missing_code: "ログインに失敗しました。もう一度お試しください。",
  /** 利用者が Google の同意画面で拒否した、または provider がエラーを返した */
  provider_denied: "ログインがキャンセルされました。",
  /** 認可コードからセッションへの交換に失敗した（コード期限切れ・verifier 不一致など） */
  exchange_failed: "ログインに失敗しました。もう一度お試しください。",
  /** Supabase の環境変数が未設定（デプロイ設定の不備） */
  auth_config_error: "ログイン設定に問題があります。管理者にお問い合わせください。",
} as const;

/** OAuth コールバックの失敗理由コード。 */
export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;

/** 未知の `auth_error` 値が来たときに表示する文言（将来コードを増やしても無言で失敗させない）。 */
export const AUTH_ERROR_FALLBACK_MESSAGE = "ログインに失敗しました。もう一度お試しください。";

/**
 * `auth_error` クエリの値を表示用メッセージへ解決する。未知の値・null は fallback を返す。
 * @param code URL から読み取った失敗理由コード（未指定は null）
 * @returns 表示するメッセージ。エラーが無ければ null
 */
export const resolveAuthErrorMessage = (code: string | null): string | null => {
  if (!code) return null;
  if (code in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[code as AuthErrorCode];
  }
  return AUTH_ERROR_FALLBACK_MESSAGE;
};
