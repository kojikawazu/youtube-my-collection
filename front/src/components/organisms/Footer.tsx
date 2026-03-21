import React from "react";
import { Youtube } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 px-6 text-center border-t border-red-50">
      <div className="flex items-center justify-center gap-2 text-red-950 font-bold mb-2 opacity-30">
        <Youtube className="w-4 h-4" />
        <span className="text-sm uppercase tracking-widest">MyYouTubeHub コレクション</span>
      </div>
      <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest">
        © 2024 個人用ライブラリ
      </p>
    </footer>
  );
};
