import React from "react";
import { LogIn, LogOut, Youtube, ShieldCheck } from "lucide-react";

type HeaderProps = {
  isAdmin: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onLogoClick: () => void;
};

export const Header: React.FC<HeaderProps> = ({ isAdmin, onLogout, onLogin, onLogoClick }) => {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-red-50 bg-white/70 px-6 py-4 backdrop-blur-xl">
      <div onClick={onLogoClick} className="group flex cursor-pointer items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 shadow-lg shadow-red-200 transition-transform group-hover:scale-110">
          <Youtube className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-red-950">MyYouTubeHub</span>
      </div>

      <div className="flex items-center gap-4">
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
              <span className="text-[10px] font-bold tracking-widest text-red-900 uppercase">
                管理者
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-sm font-bold text-red-400 hover:text-red-600"
              aria-label="ログアウト"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="p-2 text-red-400 transition-colors hover:text-red-600"
            aria-label="ログイン"
          >
            <LogIn className="h-5 w-5" />
          </button>
        )}
      </div>
    </nav>
  );
};
