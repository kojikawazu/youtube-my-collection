import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

type LoginScreenProps = {
  onGoogleLogin: () => void;
  onBack: () => void;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogleLogin,
  onBack,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] border border-red-50 shadow-2xl shadow-red-500/5 p-10 sm:p-16 text-center">
        <div className="mb-10 relative inline-block">
          <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-12 h-12 text-red-500" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 border-4 border-white rounded-full flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </motion.div>
        </div>

        <h1 className="text-3xl font-extrabold text-red-950 mb-3 tracking-tight">
          管理者ログイン
        </h1>
        <p className="text-sm text-red-800/40 mb-12 font-medium leading-relaxed">
          管理権限が必要です。<br />Googleアカウントで認証してください。
        </p>

        <button
          onClick={onGoogleLogin}
          className="w-full flex items-center justify-center gap-4 bg-white border border-gray-100 hover:border-red-200 hover:bg-red-50 text-gray-700 font-bold py-5 px-8 rounded-[2rem] transition-all shadow-sm mb-8 group"
        >
          <svg
            className="w-6 h-6 group-hover:scale-110 transition-transform"
            viewBox="0 0 48 48"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Googleでログイン
        </button>

        <button
          onClick={onBack}
          className="text-sm font-bold text-red-300 hover:text-red-500 transition-colors uppercase tracking-widest"
        >
          コレクションへ戻る
        </button>
      </div>
    </div>
  );
};
