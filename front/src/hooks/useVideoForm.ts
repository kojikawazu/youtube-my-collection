import { useState } from "react";
import { VideoItem } from "@/lib/types";
import { ValidationErrors, validateVideoInput } from "@/lib/validation";
import { getYoutubeThumbnail } from "@/lib/youtube";

type UseVideoFormOptions = {
  accessToken: string | null;
  showToast: (message: string) => void;
  refreshListPage: (page: number) => Promise<void>;
  refreshCurrentPage: () => Promise<void>;
};

/**
 * 追加/編集フォームの状態とフィールド単位のバリデーションエラーを管理するフック。
 * `handleSave` は検証してから「実際に送信する非同期アクション」を返す遅延実行方式で、
 * 呼び出し側が確認モーダルを挟めるようにしている（追加は 1 ページ目、編集は現在ページを再取得）。
 */
export function useVideoForm({
  accessToken,
  showToast,
  refreshListPage,
  refreshCurrentPage,
}: UseVideoFormOptions) {
  const [formData, setFormData] = useState<Partial<VideoItem>>({});
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  /** 追加フォームを初期値（空・評価3・カテゴリ既定）で初期化し、エラーをクリアする。 */
  const initAdd = () => {
    setFormData({
      title: "",
      youtubeUrl: "",
      category: "プログラミング",
      rating: 3,
      tags: [],
      goodPoints: "",
      memo: "",
    });
    setFormErrors({});
  };

  /** 既存動画の値でフォームを初期化する（編集開始時）。 */
  const initEdit = (video: VideoItem) => {
    setFormData({ ...video });
    setFormErrors({});
  };

  /** 1 フィールドを更新し、そのフィールドに残っていたエラーがあれば消す（入力で即解消）。 */
  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof ValidationErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /** 指定フィールドのバリデーションエラーを消す。 */
  const clearError = (field: keyof ValidationErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /**
   * 入力を検証し、成功時のみ送信を行う `action` を返す（この時点では送信しない）。
   * `valid: false` の場合は `action` が no-op（`null` を返す）。編集成功時のみ更新後の動画を返す。
   */
  const handleSave = (
    mode: "add" | "edit",
    selectedVideoId?: string,
  ): {
    action: () => Promise<VideoItem | null>;
    valid: boolean;
  } => {
    const { errors } = validateVideoInput(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return { action: async () => null, valid: false };
    }

    // 実際の送信処理。add は POST → 1 ページ目を再取得、edit は PATCH → 現在ページを再取得。
    // サムネ URL は YouTube URL から都度導出する。
    const action = async (): Promise<VideoItem | null> => {
      if (mode === "add") {
        const response = await fetch("/api/videos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            youtubeUrl: formData.youtubeUrl,
            title: formData.title,
            thumbnailUrl: getYoutubeThumbnail(formData.youtubeUrl ?? ""),
            tags: formData.tags ?? [],
            category: formData.category ?? "未分類",
            rating: formData.rating ?? 3,
            goodPoints: formData.goodPoints ?? "",
            memo: formData.memo ?? "",
            publishDate: null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create video");
        }

        await response.json();
        await refreshListPage(1);
        showToast("追加しました。");
        return null;
      } else {
        const targetId = formData.id ?? selectedVideoId;
        if (!targetId) {
          throw new Error("更新対象のIDが見つかりません。");
        }

        const response = await fetch(`/api/videos/${targetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            id: targetId,
            youtubeUrl: formData.youtubeUrl,
            title: formData.title,
            thumbnailUrl: getYoutubeThumbnail(formData.youtubeUrl ?? ""),
            tags: formData.tags ?? [],
            category: formData.category ?? "未分類",
            rating: formData.rating ?? 3,
            goodPoints: formData.goodPoints ?? "",
            memo: formData.memo ?? "",
            publishDate: formData.publishDate ?? null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update video");
        }

        const updated = (await response.json()) as VideoItem;
        await refreshCurrentPage();
        showToast("更新しました。");
        return updated;
      }
    };

    return { action, valid: true };
  };

  return {
    formData,
    formErrors,
    setFormData,
    initAdd,
    initEdit,
    updateField,
    clearError,
    handleSave,
  };
}
