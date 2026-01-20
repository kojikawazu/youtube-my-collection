
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple markdown processor logic (mimics basic markdown)
  const lines = content.split('\n').map((line, idx) => {
    if (line.startsWith('- ')) {
      return <li key={idx} className="ml-4 list-disc">{line.substring(2)}</li>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={idx} className="font-bold text-red-800 mt-2 mb-1">{line.substring(4)}</h4>;
    }
    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }
    return <p key={idx} className="leading-relaxed text-red-900 opacity-90">{line}</p>;
  });

  return (
    <div className="prose prose-sm text-sm sm:text-base bg-white/50 p-4 rounded-xl border border-red-50/50">
      <ul className="space-y-1">{lines}</ul>
    </div>
  );
};
