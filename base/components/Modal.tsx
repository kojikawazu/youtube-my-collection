
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, onConfirm, title, message, confirmLabel, cancelLabel = 'キャンセル', variant = 'info'
}) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-950/20 backdrop-blur-md" 
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl p-10 text-center border border-red-50"
          >
            <div className={`w-20 h-20 mx-auto mb-8 rounded-[2rem] flex items-center justify-center ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-red-50 text-red-950'}`}>
              {variant === 'danger' ? <AlertTriangle className="w-10 h-10" /> : <Info className="w-10 h-10" />}
            </div>
            <h2 className="text-2xl font-extrabold text-red-950 mb-3">{title}</h2>
            <p className="text-red-800/50 text-sm font-medium leading-relaxed mb-10">{message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { onConfirm(); onClose(); }}
                className={`w-full py-5 rounded-[1.5rem] font-bold transition-all hover:-translate-y-1 shadow-xl ${variant === 'danger' ? 'bg-red-500 text-white shadow-red-200' : 'bg-red-950 text-white shadow-red-950/20'}`}
              >
                {confirmLabel}
              </button>
              <button onClick={onClose} className="w-full py-5 rounded-[1.5rem] font-bold text-red-300 hover:text-red-500 transition-colors">
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
