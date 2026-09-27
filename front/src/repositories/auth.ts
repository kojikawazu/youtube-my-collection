// 認証・認可 API（/api/auth/admin）へのアクセスを閉じ込める層。
// `fetch` はこのレイヤにだけ書く（.claude/rules/frontend.md「通信は repositories/ に閉じる」）。

/**
 * サーバーの `/api/auth/admin` にトークンを渡し、管理者 allowlist の判定を得る。
 *
 * 非管理者は 2xx 以外で返るため、**判定結果としての false と通信失敗を区別しない**。
 * 呼び出し側はいずれの場合も「管理者ではない」として扱えばよく、
 * 例外を投げると全呼び出し側で同じ catch を書くことになるため、ここで false に畳む。
 * セキュリティ境界はサーバー側（`requireAdmin`）にあり、本判定は UX のためのもの。
 * @param accessToken 検証する Supabase アクセストークン
 * @returns 管理者なら true、非管理者・通信失敗なら false
 */
export const fetchIsAdmin = async (accessToken: string): Promise<boolean> => {
  try {
    const response = await fetch("/api/auth/admin", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return false;

    const data = (await response.json()) as { isAdmin?: boolean };
    return Boolean(data.isAdmin);
  } catch (error) {
    console.error(error);
    return false;
  }
};
