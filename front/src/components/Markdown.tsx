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

type MarkdownProps = {
  content: string;
};

export const Markdown = ({ content }: MarkdownProps) => {
  return (
    <div className="markdown text-rose-950/80">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(uri) => safeUri(uri)}
        components={{
          a: ({ children, ...props }) => (
            <a
              {...props}
              className="text-rose-600 underline underline-offset-4"
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
              className="rounded-2xl border border-rose-100 shadow-sm"
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
