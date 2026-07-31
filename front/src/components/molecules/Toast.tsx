import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastProps = {
  message: string | null;
};

/** 画面下部に一時的な通知メッセージを表示するトースト。 */
export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    // live region は常に DOM 上に存在させる必要がある（後から挿入された領域は読み上げられないため）。
    // アニメーションする中身だけを AnimatePresence で出し入れする。
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-6 right-6 z-[120]"
    >
      <AnimatePresence>
        {message && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-sm font-bold text-red-600 shadow-lg shadow-red-200/40 backdrop-blur"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
