import { useState } from "react";

type ModalConfig = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  variant: "danger" | "info";
};

export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig>({
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "info",
  });

  const openDeleteModal = (
    title: string,
    onConfirm: () => Promise<void>
  ) => {
    setConfig({
      title: "動画を削除しますか？",
      message: `「${title}」を完全に削除します。`,
      variant: "danger",
      onConfirm,
    });
    setIsOpen(true);
  };

  const openSaveModal = (onConfirm: () => Promise<void>) => {
    setConfig({
      title: "変更を保存しますか？",
      message: "入力内容で更新します。",
      variant: "info",
      onConfirm,
    });
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  return { isOpen, config, openDeleteModal, openSaveModal, close };
}
