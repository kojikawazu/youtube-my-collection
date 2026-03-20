import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="text-sm sm:text-base bg-white/50 p-4 rounded-xl border border-red-50/50 text-red-950/80 space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(uri) => safeUri(uri)}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-red-800 mt-3 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-red-800 mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-red-800 mt-3 mb-1.5">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-bold text-red-800 mt-2 mb-1">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed text-red-900/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1 ml-4 list-disc">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 ml-4 list-decimal">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
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
