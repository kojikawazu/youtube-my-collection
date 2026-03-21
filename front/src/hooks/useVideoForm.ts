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

export function useVideoForm({
  accessToken,
  showToast,
  refreshListPage,
  refreshCurrentPage,
}: UseVideoFormOptions) {
  const [formData, setFormData] = useState<Partial<VideoItem>>({});
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

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

  const initEdit = (video: VideoItem) => {
    setFormData({ ...video });
    setFormErrors({});
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof ValidationErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const clearError = (field: keyof ValidationErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = (
    mode: "add" | "edit",
    selectedVideoId?: string
  ): {
    action: () => Promise<VideoItem | null>;
    valid: boolean;
  } => {
    const { errors } = validateVideoInput(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return { action: async () => null, valid: false };
    }

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
