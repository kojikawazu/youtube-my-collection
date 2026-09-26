/**
 * 管理者判定（`/api/auth/admin`）の結果。repositories が API 応答から解釈し、hooks が画面の振る舞いを決める。
 * 429 を `denied` に混ぜると、本物の管理者が「権限がありません」と表示されて強制サインアウトされるため分ける。
 */
export type AdminCheckResult =
  /** allowlist に一致した管理者 */
  | "admin"
  /** 管理者ではない。未認証・トークン無効・allowlist 不一致・通信失敗を含む */
  | "denied"
  /** レートリミット超過（429）。管理者かどうかは判定できていない */
  | "rate-limited";
