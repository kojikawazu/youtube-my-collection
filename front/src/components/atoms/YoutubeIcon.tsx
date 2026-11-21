import React from "react";

type YoutubeIconProps = {
  /** サイズ・色を指定する Tailwind のクラス。線の色は `currentColor` なので `text-*` で変わる */
  className?: string;
};

/**
 * YouTube を表す線画のアイコン（装飾用）。
 *
 * lucide-react 1.0 でブランドアイコンが削除されたため（issue #256）、それまで使っていた
 * lucide-react 0.460.0 の `Youtube` と同じ path・属性を自前で持つ。YouTube 公式のロゴではない。
 * path の出典: lucide-react v0.460.0 `icons/youtube.js`（ISC License, Copyright (c) Lucide Contributors）
 */
export const YoutubeIcon: React.FC<YoutubeIconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
};
