import type { Metadata } from "next";
import { AuthCallbackClient } from "./AuthCallbackClient";

// クライアントコンポーネントは metadata を export できないため、サーバー側の
// ページラッパーで noindex を維持し、処理本体を AuthCallbackClient に委譲する。
export const metadata: Metadata = {
  title: "ログイン処理中 | YouTube My Collection",
  robots: { index: false, follow: false },
};

/**
 * `/auth/callback` のサーバーラッパー。
 * PKCE の code verifier はログイン開始時のブラウザクライアントにしか無いため、
 * 認可コードの交換は Route Handler ではなくクライアント側で行う（issue #165）。
 */
export default function AuthCallbackPage() {
  return <AuthCallbackClient />;
}
