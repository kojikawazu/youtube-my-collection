import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Next.js 16.3 以降、dev サーバーは自身と異なるオリジンからの開発用リソース（/_next/hmr 等）を
  // 既定で遮断する。E2E（playwright.config.ts）は 127.0.0.1 でアクセスするが、dev サーバーは
  // 自身を localhost と認識するため、許可しないとクライアント側の処理（一覧取得・セッション判定）が動かず E2E が全滅する。
  // dev サーバー専用の設定で、本番ビルドの挙動には影響しない。
  allowedDevOrigins: ["127.0.0.1"],
  // next dev が AI エージェントを検知すると front/AGENTS.md・front/CLAUDE.md を自動生成する。
  // エージェント向けルールの正本はルートの CLAUDE.md と .claude/rules/ に一本化しているため止める。
  // ファイルを消すだけでは dev 起動のたびに再生成されるので、設定で明示的にオプトアウトする。
  agentRules: false,
};

export default nextConfig;
