import React, { useState } from "react";
import { Screen, VideoItem } from "@/types";
import type { HomeTemplateProps } from "@/components/templates/HomeTemplate";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { useVideos } from "@/hooks/useVideos";
import { useVideoForm } from "@/hooks/useVideoForm";
import { useConfirmModal } from "@/hooks/useConfirmModal";

/**
 * ホーム画面の合成ルート（Atomic Design の pages 層のロジック本体）。
 * 認証・一覧・フォーム・トースト・確認モーダルの各フックを束ね、画面遷移の状態機械と
 * CRUD の協調ハンドラ（削除/保存の確認モーダル連携・キャンセル/ログアウト後の遷移）を組み立てる。
 * 戻り値は `HomeTemplate`（templates 層）へそのまま注入できる props 一式。
 * @returns `HomeTemplate` に渡す props（画面状態・一覧/フォーム/モーダルの値と全ハンドラ）
 */
export function useHomeScreen(): HomeTemplateProps {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.List);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const { toastMessage, showToast } = useToast();

  const { isAdmin, accessToken, login, logout } = useAuth({
    showToast,
    onNonAdminRejected: () => setCurrentScreen(Screen.List),
  });

  const {
    videos,
    totalCount,
    currentPage,
    setCurrentPage,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    isLoading,
    loadError,
    totalPages,
    visiblePageNumbers,
    refreshListPage,
    refreshCurrentPage,
    deleteVideo,
  } = useVideos();

  const form = useVideoForm({
    accessToken,
    showToast,
    refreshListPage,
    refreshCurrentPage,
  });

  const modal = useConfirmModal();

  // --- Navigation ---

  /** 一覧へ戻る。詳細の選択を解除し、先頭までスクロールする。 */
  const navigateToList = () => {
    setCurrentScreen(Screen.List);
    setSelectedVideo(null);
    window.scrollTo(0, 0);
  };

  /**
   * 指定動画の詳細へ遷移する。選択動画を保持し、先頭までスクロールする。
   * @param video 詳細表示する動画
   */
  const navigateToDetail = (video: VideoItem) => {
    setSelectedVideo(video);
    setCurrentScreen(Screen.Detail);
    window.scrollTo(0, 0);
  };

  /** 追加画面へ遷移する。遷移前に form.initAdd() で入力欄を初期化する。 */
  const navigateToAdd = () => {
    form.initAdd();
    setCurrentScreen(Screen.Add);
    window.scrollTo(0, 0);
  };

  /**
   * 編集画面へ遷移する。遷移前に form.initEdit(video) で既存値を流し込む。
   * @param video 編集対象の動画
   */
  const navigateToEdit = (video: VideoItem) => {
    form.initEdit(video);
    setCurrentScreen(Screen.Edit);
    window.scrollTo(0, 0);
  };

  // --- Actions ---

  /**
   * 削除確認モーダルを開き、確認時に削除→トースト表示まで行う。
   * 詳細画面で表示中の動画を消した場合は一覧へ戻す。
   * @param id 削除対象の動画 ID
   * @param title 確認文に表示する動画タイトル
   * @param e カード内ボタン由来のイベント（カードのクリック伝播を止めるため任意で受ける）
   */
  const handleDeleteRequest = (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    modal.openDeleteModal(title, async () => {
      try {
        await deleteVideo(id, accessToken);
        if (selectedVideo?.id === id) {
          navigateToList();
        }
        showToast("削除しました。");
      } catch (error) {
        console.error(error);
        alert("削除に失敗しました。");
        throw error;
      }
    });
  };

  /**
   * 現在の画面（追加/編集）に応じて入力を検証し、通れば保存確認モーダルを開く。
   * 追加は成功で一覧へ、編集は成功で更新後の詳細へ遷移する。
   */
  const handleSaveRequest = () => {
    const mode = currentScreen === Screen.Add ? "add" : "edit";
    const { action, valid } = form.handleSave(mode, selectedVideo?.id);
    if (!valid) return;

    modal.openSaveModal(async () => {
      try {
        if (mode === "add") {
          await action();
          navigateToList();
        } else {
          const updated = await action();
          if (updated) setSelectedVideo(updated);
          setCurrentScreen(Screen.Detail);
        }
      } catch (error) {
        console.error(error);
        alert(
          mode === "add"
            ? "保存に失敗しました。"
            : `更新に失敗しました。${error instanceof Error ? error.message : ""}`,
        );
        throw error;
      }
    });
  };

  // 追加はキャンセルで一覧へ、編集はキャンセルで元の詳細へ戻す。
  // 編集時は selectedVideo が必ず存在するため非 null を明示（追加時はこの分岐に入らない）。
  const handleFormCancel = () =>
    currentScreen === Screen.Add ? navigateToList() : navigateToDetail(selectedVideo!);

  // ログアウト後は一覧画面へ戻す（管理者専用画面に留まらせない）。
  const handleLogout = async () => {
    await logout();
    navigateToList();
  };

  return {
    currentScreen,
    selectedVideo,
    isAdmin,
    onNavigateList: navigateToList,
    onLogin: () => setCurrentScreen(Screen.Login),
    onLogout: handleLogout,
    onGoogleLogin: login,
    videos,
    searchQuery,
    onSearchChange: setSearchQuery,
    sortOption,
    onSortChange: setSortOption,
    isLoading,
    loadError,
    totalCount,
    currentPage,
    totalPages,
    visiblePageNumbers,
    onPageChange: setCurrentPage,
    onVideoClick: navigateToDetail,
    onVideoDelete: handleDeleteRequest,
    onVideoEdit: navigateToEdit,
    formData: form.formData,
    formErrors: form.formErrors,
    onFormChange: form.setFormData,
    onErrorClear: form.clearError,
    onFormSave: handleSaveRequest,
    onFormCancel: handleFormCancel,
    onAddClick: navigateToAdd,
    modalOpen: modal.isOpen,
    modalTitle: modal.config.title,
    modalMessage: modal.config.message,
    modalVariant: modal.config.variant,
    onModalConfirm: modal.config.onConfirm,
    onModalClose: modal.close,
    toastMessage,
  };
}
