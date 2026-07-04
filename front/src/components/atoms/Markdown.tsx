import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * http(s) の URL のみ通し、それ以外（`javascript:` 等）は空文字にする XSS 対策。
 * @param uri 検査対象の URL（未指定可）
 */
const safeUri = (uri?: string) => {
  if (!uri) return "";
  const trimmed = uri.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "";
};

type MarkdownRendererProps = {
  content: string;
};

/** ユーザー入力の Markdown を安全に描画する（生 HTML 無効・http(s) のリンク/画像のみ許可）。 */
export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="space-y-2 rounded-xl border border-red-50/50 bg-white/50 p-4 text-sm text-red-950/80 sm:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(uri) => safeUri(uri)}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-3 mb-2 text-xl font-bold text-red-800">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-2 text-lg font-bold text-red-800">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1.5 text-base font-bold text-red-800">{children}</h3>
          ),
          h4: ({ children }) => <h4 className="mt-2 mb-1 font-bold text-red-800">{children}</h4>,
          p: ({ children }) => <p className="leading-relaxed text-red-900/90">{children}</p>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ children, ...props }) => (
            <a
              {...props}
              className="text-red-600 underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied URLs from markdown content
            <img
              {...props}
              alt={props.alt ?? ""}
              className="rounded-2xl border border-red-100 shadow-sm"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
