import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastProps = {
  message: string | null;
};

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed right-6 top-6 z-[120] rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-sm font-bold text-red-600 shadow-lg shadow-red-200/40 backdrop-blur"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
