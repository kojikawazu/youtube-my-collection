import React from "react";
import { Youtube } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-red-50 px-6 py-12 text-center">
      <div className="mb-2 flex items-center justify-center gap-2 font-bold text-red-950 opacity-30">
        <Youtube className="h-4 w-4" />
        <span className="text-sm tracking-widest uppercase">MyYouTubeHub コレクション</span>
      </div>
      <p className="text-[10px] font-bold tracking-widest text-red-200 uppercase">
        © 2024 個人用ライブラリ
      </p>
    </footer>
  );
};
