import { useEffect, useRef, useState } from "react";

/**
 * トースト通知を管理するフック。`showToast` 呼び出しごとに 2200ms 後に自動で消え、
 * 連続呼び出し時は前のタイマーを破棄して最新メッセージを優先する（アンマウント時も掃除）。
 */
export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // アンマウント時に未発火のタイマーを掃除し、解放後の setState を防ぐ。
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  /** メッセージを表示し、既存タイマーを破棄して 2200ms 後に自動で消すタイマーを張り直す。 */
  const showToast = (message: string) => {
    setToastMessage(message);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  return { toastMessage, showToast };
}
