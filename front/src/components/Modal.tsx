import React, { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "info";
};

/** 確認ダイアログ（`danger`/`info`）。実行中は送信ボタンを無効化し二重実行を防ぐ。 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "実行",
  cancelLabel = "キャンセル",
  variant = "info",
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();

  /**
   * ダイアログ内のフォーカス可能要素を DOM 順で取得する。
   * disabled な要素（送信中のボタン）はフォーカス対象外なので除外する。
   * @returns フォーカス可能な要素の配列（ダイアログ未描画時は空配列）
   */
  const getFocusableElements = (): HTMLElement[] => {
    const root = dialogRef.current;
    if (!root) return [];

    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));
  };

  // 開いたら先頭要素へフォーカスを移し、閉じたら開く前にフォーカスしていた要素へ戻す。
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    getFocusableElements()[0]?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  // Escape で閉じ、Tab はダイアログ内で循環させる（背面へフォーカスが抜けないようにする）。
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isSubmitting) {
          onClose();
        }
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // 端を越えるときだけ既定動作を止めて反対側へ送る。ダイアログ外に居る場合も内側へ引き戻す。
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  // 表示中は背景（body）のスクロールをロックし、閉じたら元の overflow 値へ復元する。
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow || "unset";
    };
  }, [isOpen]);

  /**
   * 確認アクションを実行する。二重実行を防ぎつつ onConfirm を await し、成功時のみ閉じる。
   * 失敗時はモーダルを閉じずにエラーをログし、ユーザーが再操作できるようにする。
   */
  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Modal confirm failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
            className="absolute inset-0 bg-red-950/20 backdrop-blur-md"
            onClick={() => {
              if (!isSubmitting) {
                onClose();
              }
            }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm rounded-[3rem] border border-red-50 bg-white p-10 text-center shadow-2xl"
          >
            <div
              className={`mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] ${
                variant === "danger" ? "bg-red-50 text-red-500" : "bg-red-50 text-red-950"
              }`}
            >
              {variant === "danger" ? (
                <AlertTriangle aria-hidden="true" className="h-10 w-10" />
              ) : (
                <Info aria-hidden="true" className="h-10 w-10" />
              )}
            </div>
            <h2 id={titleId} className="mb-3 text-2xl font-extrabold text-red-950">
              {title}
            </h2>
            <p id={messageId} className="mb-10 text-sm leading-relaxed font-medium text-red-800/50">
              {message}
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleConfirm();
                }}
                disabled={isSubmitting}
                className={`w-full rounded-[1.5rem] py-5 font-bold shadow-xl transition-all hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 ${
                  variant === "danger"
                    ? "bg-red-500 text-white shadow-red-200"
                    : "bg-red-950 text-white shadow-red-950/20"
                }`}
              >
                {isSubmitting ? "処理中..." : confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    onClose();
                  }
                }}
                disabled={isSubmitting}
                className="w-full rounded-[1.5rem] py-5 font-bold text-red-300 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
