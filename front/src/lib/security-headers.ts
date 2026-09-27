// 全レスポンスに付与するセキュリティヘッダーを組み立てる純粋関数（issue #192）。
// next.config.ts の headers() から呼ぶ。ビルド時設定からも読むため server-only は付けず、
// process.env も直接読まない（呼び出し側が値を渡す）。
// 各ディレクティブを選んだ理由と観測記録は docs/06-security-specification.md「セキュリティヘッダー」を正本とする。

/** レスポンスヘッダー 1 件。next.config.ts の `headers()` が受け取る形。 */
type SecurityHeader = {
  /** ヘッダー名 */
  key: string;
  /** ヘッダー値 */
  value: string;
};

/** ヘッダーの組み立てに使う環境情報。 */
type SecurityHeaderOptions = {
  /** `next dev` で動いているか。React の dev モードだけが必要とする許可を足すために使う */
  isDev: boolean;
  /** Supabase のプロジェクト URL（`NEXT_PUBLIC_SUPABASE_URL`）。未設定・不正なら undefined / 空文字 */
  supabaseUrl: string | undefined;
};

/**
 * CSP を載せるヘッダー名。
 * 現在は観測モード（Report-Only）: 違反を報告するだけでブロックしない。
 * 本番で違反 0 件を確認したら `Content-Security-Policy`（強制）へ切り替える（issue #192 の第 2 段階）。
 */
const CSP_HEADER_KEY = "Content-Security-Policy-Report-Only";

/** Swagger UI（`/docs`）を配信する CDN。`hooks/useDocsPage.ts` が SRI 付きで読み込む。 */
const SWAGGER_CDN_ORIGIN = "https://cdn.jsdelivr.net";

/**
 * Supabase の URL からオリジンだけを取り出す。パスが付いていても CSP のソースはオリジン単位で書く。
 * @param url Supabase のプロジェクト URL
 * @returns オリジン（`https://xxx.supabase.co`）。未設定・URL として不正なら null
 */
const toOrigin = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Content-Security-Policy の値を組み立てる。
 * @param options 実行環境と Supabase の URL
 * @returns `; ` 区切りのディレクティブ文字列
 */
const buildCsp = (options: SecurityHeaderOptions): string => {
  const supabaseOrigin = toOrigin(options.supabaseUrl);
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // クリックジャッキング対策。X-Frame-Options: DENY と多層にする。
    "frame-ancestors 'none'",
    "form-action 'self'",
    // 'unsafe-inline' は Next.js のハイドレーション用インラインスクリプトのため（nonce 化は見送り。docs/06）。
    // 'unsafe-eval' は React の dev モードだけが使うため、本番では許可しない。
    [
      "script-src 'self' 'unsafe-inline'",
      options.isDev ? "'unsafe-eval'" : null,
      SWAGGER_CDN_ORIGIN,
    ]
      .filter(Boolean)
      .join(" "),
    // framer-motion と style 属性のインラインスタイル、Swagger UI の CSS のため。
    `style-src 'self' 'unsafe-inline' ${SWAGGER_CDN_ORIGIN}`,
    // サムネイル（YouTube・ユーザー入力の URL）と Markdown 内の画像が任意の https を参照しうるため広めに許可する。
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Supabase Auth（セッション取得・トークン更新・PKCE 交換）への通信。
    ["connect-src 'self'", supabaseOrigin].filter(Boolean).join(" "),
  ];
  return directives.join("; ");
};

/**
 * 全レスポンスに付与するセキュリティヘッダーを組み立てる。
 * @param options 実行環境と Supabase の URL
 * @returns ヘッダーの配列（next.config.ts の `headers()` にそのまま渡せる形）
 */
export const buildSecurityHeaders = (options: SecurityHeaderOptions): SecurityHeader[] => [
  { key: CSP_HEADER_KEY, value: buildCsp(options) },
  // MIME スニッフィングで意図しない形式として解釈させない。
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 自サイトを iframe に埋め込む機能は無いため、埋め込みを全面禁止する（古いブラウザ向けに CSP と多層）。
  { key: "X-Frame-Options", value: "DENY" },
  // 外部遷移時はオリジンだけを送り、URL のパス（動画 ID 等）を漏らさない。
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 使っていないデバイス権限は明示的に無効化する。
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
