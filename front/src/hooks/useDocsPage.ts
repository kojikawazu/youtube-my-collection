// API ドキュメント画面（/docs）のクライアントガードのロジック。
// セキュリティ境界はサーバー側の `/api/openapi.json`（requireAdmin）にあり、ここでは
// 「管理者でなければログインを促す」UX と、Swagger UI への Bearer トークン注入を担う。
// React コンポーネント（swagger-ui-react）を使わないのは React 19 とのピア依存の摩擦を
// 避けるため（docs/notes/openapi-zod-plan.md 参照）。

import { useEffect, useState } from "react";
import { fetchIsAdmin } from "@/repositories/auth";
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

/** ドキュメント画面の表示状態。 */
export type DocsStatus =
  /** セッション確認・管理者判定・Swagger UI 読み込みのいずれかが進行中 */
  | "loading"
  /** 未ログイン、または管理者 allowlist 外（ログイン誘導を出す） */
  | "unauthorized"
  /** Swagger UI（CDN）の読み込みに失敗した */
  | "error"
  /** Swagger UI の描画まで完了した */
  | "ready";

type SwaggerRequest = { headers: Record<string, string>; [key: string]: unknown };

declare global {
  // グローバル拡張は宣言マージが必要で type では表現できないため interface を使う。
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    SwaggerUIBundle?: (config: {
      url: string;
      dom_id: string;
      requestInterceptor?: (req: SwaggerRequest) => SwaggerRequest;
    }) => unknown;
  }
}

/**
 * CDN のスタイルシートを SRI 付きで一度だけ読み込む（href で重複検知）。
 * @param href 読み込む CSS の URL
 * @param integrity SRI ハッシュ
 * @returns 読み込み完了を表す Promise
 */
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

/**
 * loadStylesheet と対。CDN スクリプトを SRI 付きで一度だけ読み込む（src で重複検知）。
 * @param src 読み込むスクリプトの URL
 * @param integrity SRI ハッシュ
 * @returns 読み込み完了を表す Promise
 */
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

/** `useDocsPage` の戻り値。 */
export type UseDocsPageResult = {
  /** 画面の表示状態。描画側はこの値だけで出し分ける */
  status: DocsStatus;
};

/**
 * API ドキュメント画面の状態機械。
 * セッション取得 → 管理者判定 → 通過時のみ Swagger UI を CDN から読み込んで描画する。
 * 描画先（`#swagger-ui`）は呼び出し側が常にマウントしておく必要がある。
 * @returns 画面の表示状態
 */
export function useDocsPage(): UseDocsPageResult {
  const [status, setStatus] = useState<DocsStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setStatus("unauthorized");
        return;
      }

      const isAdmin = await fetchIsAdmin(token);
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

  return { status };
}
