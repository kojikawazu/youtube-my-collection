// 認証・認可 API（/api/auth/admin）へのアクセスを閉じ込める層。
// `fetch` はこのレイヤにだけ書く（.claude/rules/frontend.md「通信は repositories/ に閉じる」）。

import type { AdminCheckResult } from "@/types/auth";

/** レートリミット超過を表す HTTP ステータス。 */
const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * サーバーの `/api/auth/admin` にトークンを渡し、管理者 allowlist の判定を得る。
 *
 * 非管理者は 2xx 以外で返るため、**判定結果としての「非管理者」と通信失敗を区別しない**（どちらも `denied`）。
 * 呼び出し側はいずれの場合も「管理者ではない」として扱えばよく、
 * 例外を投げると全呼び出し側で同じ catch を書くことになるため、ここで畳む。
 * ただし **429 だけは `rate-limited` として分ける**。`denied` に混ぜると、本物の管理者が
 * 「権限がありません」と表示されて強制サインアウトされ、原因を取り違えさせるため。
 * セキュリティ境界はサーバー側（`requireAdmin`）にあり、本判定は UX のためのもの。
 * @param accessToken 検証する Supabase アクセストークン
 * @returns 管理者なら `admin`、レートリミット超過なら `rate-limited`、それ以外は `denied`
 */
export const fetchIsAdmin = async (accessToken: string): Promise<AdminCheckResult> => {
  try {
    const response = await fetch("/api/auth/admin", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
    if (!response.ok) return "denied";

    const data = (await response.json()) as { isAdmin?: boolean };
    return data.isAdmin ? "admin" : "denied";
  } catch (error) {
    console.error(error);
    return "denied";
  }
};
