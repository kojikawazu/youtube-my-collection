import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

type LoginScreenProps = {
  onGoogleLogin: () => void;
  onBack: () => void;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleLogin, onBack }) => {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[3.5rem] border border-red-50 bg-white p-10 text-center shadow-2xl shadow-red-500/5 sm:p-16">
        <div className="relative mb-10 inline-block">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-red-50">
            <ShieldCheck className="h-12 w-12 text-red-500" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-red-500"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </motion.div>
        </div>

        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-red-950">管理者ログイン</h1>
        <p className="mb-12 text-sm leading-relaxed font-medium text-red-800/40">
          管理権限が必要です。
          <br />
          Googleアカウントで認証してください。
        </p>

        <button
          onClick={onGoogleLogin}
          className="group mb-8 flex w-full items-center justify-center gap-4 rounded-[2rem] border border-gray-100 bg-white px-8 py-5 font-bold text-gray-700 shadow-sm transition-all hover:border-red-200 hover:bg-red-50"
        >
          <svg className="h-6 w-6 transition-transform group-hover:scale-110" viewBox="0 0 48 48">
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
          className="text-sm font-bold tracking-widest text-red-300 uppercase transition-colors hover:text-red-500"
        >
          コレクションへ戻る
        </button>
      </div>
    </div>
  );
};
