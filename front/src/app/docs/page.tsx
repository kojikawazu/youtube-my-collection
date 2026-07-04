import type { Metadata } from "next";
import { DocsClient } from "./DocsClient";

// クライアントコンポーネントは metadata を export できないため、サーバー側の
// ページラッパーで noindex を維持しつつ、認証ガード本体を DocsClient に委譲する。
export const metadata: Metadata = {
  title: "API ドキュメント | YouTube My Collection",
  robots: { index: false, follow: false },
};

/** `/docs` のサーバーラッパー。noindex を付与し、認証ガード本体を DocsClient に委譲する。 */
export default function DocsPage() {
  return <DocsClient />;
}
