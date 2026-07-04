import { useState } from "react";

type ModalConfig = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  variant: "danger" | "info";
};

/**
 * 確認モーダルの開閉と表示内容を管理するフック。
 * 削除（`danger`）・保存（`info`）のプリセットを用意し、`onConfirm` に実行アクションを差し込む。
 * @returns モーダルの `isOpen` / `config` と、`openDeleteModal` / `openSaveModal` / `close`
 */
export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig>({
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "info",
  });

  /**
   * 削除確認モーダル（`danger`）を、対象タイトル入りの文言で開く。
   * @param title 確認文に埋め込む削除対象のタイトル
   * @param onConfirm 確認時に実行する削除アクション
   */
  const openDeleteModal = (title: string, onConfirm: () => Promise<void>) => {
    setConfig({
      title: "動画を削除しますか？",
      message: `「${title}」を完全に削除します。`,
      variant: "danger",
      onConfirm,
    });
    setIsOpen(true);
  };

  /**
   * 保存確認モーダル（`info`）を開く。
   * @param onConfirm 確認時に実行する保存アクション
   */
  const openSaveModal = (onConfirm: () => Promise<void>) => {
    setConfig({
      title: "変更を保存しますか？",
      message: "入力内容で更新します。",
      variant: "info",
      onConfirm,
    });
    setIsOpen(true);
  };

  /** モーダルを閉じる。 */
  const close = () => {
    setIsOpen(false);
  };

  return { isOpen, config, openDeleteModal, openSaveModal, close };
}
