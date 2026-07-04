"use client";

// Swagger UI を CDN から読み込み、管理者のみに API ドキュメントを表示するクライアントガード。
// セキュリティ境界はサーバー側の `/api/openapi.json`（requireAdmin）にあり、ここでは
// 「管理者でなければログインを促す」UX と、Swagger UI への Bearer トークン注入を担う。
// React コンポーネント（swagger-ui-react）を使わないのは React 19 とのピア依存の摩擦を
// 避けるため（docs/notes/openapi-zod-plan.md 参照）。

import { useEffect, useState } from "react";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

const SWAGGER_UI_VERSION = "5.17.14";

const SWAGGER_CSS = {
  href: `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css`,
  integrity: "sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn",
};

const SWAGGER_JS = {
  src: `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js`,
  integrity: "sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep",
};

type Status = "loading" | "unauthorized" | "error" | "ready";

type SwaggerRequest = { headers: Record<string, string>; [key: string]: unknown };

declare global {
  interface Window {
    SwaggerUIBundle?: (config: {
      url: string;
      dom_id: string;
      requestInterceptor?: (req: SwaggerRequest) => SwaggerRequest;
    }) => unknown;
  }
}

// CDN リソースを SRI 付きで一度だけ読み込む（URL で重複検知）。
const loadStylesheet = (href: string, integrity: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.integrity = integrity;
    link.crossOrigin = "anonymous";
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`failed to load stylesheet: ${href}`));
    document.head.appendChild(link);
  });

const loadScript = (src: string, integrity: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.integrity = integrity;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load script: ${src}`));
    document.head.appendChild(script);
  });

/** サーバーの `/api/auth/admin` で管理者判定を得る。失敗・例外時は false。 */
const verifyAdmin = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch("/api/auth/admin", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { isAdmin?: boolean };
    return Boolean(data.isAdmin);
  } catch {
    return false;
  }
};

/**
 * API ドキュメント画面のクライアントガード。
 * セッション取得 → 管理者判定 → 通過時のみ Swagger UI を CDN から読み込んで描画する。
 * 非管理者にはログイン誘導、読み込み失敗時はエラーを表示する。
 */
export function DocsClient() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setStatus("unauthorized");
        return;
      }

      const isAdmin = await verifyAdmin(token);
      if (!isAdmin) {
        if (!cancelled) setStatus("unauthorized");
        return;
      }

      try {
        await loadStylesheet(SWAGGER_CSS.href, SWAGGER_CSS.integrity);
        await loadScript(SWAGGER_JS.src, SWAGGER_JS.integrity);
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;

      const container = document.getElementById("swagger-ui");
      if (container && container.childElementCount === 0) {
        window.SwaggerUIBundle?.({
          url: "/api/openapi.json",
          dom_id: "#swagger-ui",
          // 管理者ゲートの /api/openapi.json と Try-it-out の双方に Bearer を付与する。
          requestInterceptor: (req) => {
            req.headers.Authorization = `Bearer ${token}`;
            return req;
          },
        });
      }
      setStatus("ready");
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

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
