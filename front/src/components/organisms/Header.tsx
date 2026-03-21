import React from "react";
import { LogIn, LogOut, Youtube, ShieldCheck } from "lucide-react";

type HeaderProps = {
  isAdmin: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onLogoClick: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onLogout,
  onLogin,
  onLogoClick,
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-red-50 py-4 px-6 flex items-center justify-between">
      <div onClick={onLogoClick} className="flex items-center gap-2 cursor-pointer group">
        <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200 transition-transform group-hover:scale-110">
          <Youtube className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-red-950 tracking-tight text-xl">MyYouTubeHub</span>
      </div>

      <div className="flex items-center gap-4">
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
              <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
              <span className="text-[10px] font-bold text-red-900 uppercase tracking-widest">
                管理者
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-sm font-bold text-red-400 hover:text-red-600 p-2"
              aria-label="ログアウト"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="p-2 text-red-400 hover:text-red-600 transition-colors"
            aria-label="ログイン"
          >
            <LogIn className="w-5 h-5" />
          </button>
        )}
      </div>
    </nav>
  );
};
