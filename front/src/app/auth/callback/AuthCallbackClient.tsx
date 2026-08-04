"use client";

import { useAuthCallback } from "@/hooks/useAuthCallback";

/**
 * OAuth コールバックの本体（クライアント）。
 * 認可コードの交換は `useAuthCallback` に委ね、ここでは処理中の表示だけを担う。
 * 成否に関わらずトップへ遷移するため、この画面は一瞬しか表示されない。
 */
export function AuthCallbackClient() {
  const { isExchanging } = useAuthCallback();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p role="status" aria-live="polite" className="text-sm text-gray-600">
        {isExchanging ? "ログイン処理中です..." : "画面を移動しています..."}
      </p>
    </main>
  );
}
