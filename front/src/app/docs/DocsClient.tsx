"use client";

// API ドキュメント画面の描画。状態機械（セッション確認・管理者判定・Swagger UI 読み込み）は
// hooks/useDocsPage に切り出してあり、ここは表示の出し分けだけを担う。

import { signInWithGoogle } from "@/lib/auth";
import { useDocsPage } from "@/hooks/useDocsPage";

/**
 * API ドキュメント画面のクライアントガード。
 * 管理者のみ Swagger UI を表示し、非管理者にはログイン誘導、読み込み失敗時はエラーを表示する。
 */
export function DocsClient() {
  const { status } = useDocsPage();

  return (
    <main className="min-h-screen bg-white">
      {status === "loading" && (
        <p className="p-8 text-sm text-gray-500" role="status">
          読み込み中...
        </p>
      )}

      {status === "unauthorized" && (
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="text-xl font-bold text-gray-900">API ドキュメント</h1>
          <p className="mt-3 text-sm text-gray-600">
            このページは管理者のみ閲覧できます。管理者アカウントでログインしてください。
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Google でログイン
          </button>
        </div>
      )}

      {status === "error" && (
        <p className="p-8 text-sm text-red-600" role="alert">
          Swagger UI の読み込みに失敗しました。時間をおいて再読み込みしてください。
        </p>
      )}

      {/* SwaggerUIBundle の描画先。init 時に存在する必要があるため常にマウントしておく。 */}
      <div id="swagger-ui" style={{ display: status === "ready" ? "block" : "none" }} />
    </main>
  );
}
