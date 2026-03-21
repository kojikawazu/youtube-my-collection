"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Screen, VideoItem } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { Header } from "@/components/organisms/Header";
import { VideoList } from "@/components/organisms/VideoList";
import { VideoDetail } from "@/components/organisms/VideoDetail";
import { VideoForm } from "@/components/organisms/VideoForm";
import { LoginScreen } from "@/components/organisms/LoginScreen";
import { Footer } from "@/components/organisms/Footer";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { useVideos } from "@/hooks/useVideos";
import { useVideoForm } from "@/hooks/useVideoForm";
import { useConfirmModal } from "@/hooks/useConfirmModal";

export default function Page() {
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

  const navigateToList = () => {
    setCurrentScreen(Screen.List);
    setSelectedVideo(null);
    window.scrollTo(0, 0);
  };

  const navigateToDetail = (video: VideoItem) => {
    setSelectedVideo(video);
    setCurrentScreen(Screen.Detail);
    window.scrollTo(0, 0);
  };

  const navigateToAdd = () => {
    form.initAdd();
    setCurrentScreen(Screen.Add);
    window.scrollTo(0, 0);
  };

  const navigateToEdit = (video: VideoItem) => {
    form.initEdit(video);
    setCurrentScreen(Screen.Edit);
    window.scrollTo(0, 0);
  };

  // --- Actions ---

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
            : `更新に失敗しました。${error instanceof Error ? error.message : ""}`
        );
        throw error;
      }
    });
  };

  // --- Render ---

  return (
    <>
      <Header
        isAdmin={isAdmin}
        onLogout={async () => {
          await logout();
          navigateToList();
        }}
        onLogin={() => setCurrentScreen(Screen.Login)}
        onLogoClick={navigateToList}
      />

      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {currentScreen === Screen.List && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <VideoList
                videos={videos}
                isAdmin={isAdmin}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOption={sortOption}
                onSortChange={setSortOption}
                isLoading={isLoading}
                loadError={loadError}
                totalCount={totalCount}
                currentPage={currentPage}
                totalPages={totalPages}
                visiblePageNumbers={visiblePageNumbers}
                onPageChange={setCurrentPage}
                onVideoClick={navigateToDetail}
                onVideoDelete={handleDeleteRequest}
              />
            </motion.div>
          )}

          {currentScreen === Screen.Detail && selectedVideo && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <VideoDetail
                video={selectedVideo}
                isAdmin={isAdmin}
                onBack={navigateToList}
                onEdit={navigateToEdit}
                onDelete={handleDeleteRequest}
              />
            </motion.div>
          )}

          {(currentScreen === Screen.Add || currentScreen === Screen.Edit) && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <VideoForm
                mode={currentScreen === Screen.Add ? "add" : "edit"}
                formData={form.formData}
                formErrors={form.formErrors}
                onFormChange={form.setFormData}
                onErrorClear={form.clearError}
                onSave={handleSaveRequest}
                onCancel={() =>
                  currentScreen === Screen.Add
                    ? navigateToList()
                    : navigateToDetail(selectedVideo!)
                }
              />
            </motion.div>
          )}

          {currentScreen === Screen.Login && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <LoginScreen onGoogleLogin={login} onBack={navigateToList} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={modal.config.title}
        message={modal.config.message}
        onConfirm={modal.config.onConfirm}
        variant={modal.config.variant}
        confirmLabel={modal.config.variant === "danger" ? "削除" : "保存"}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed right-6 top-6 z-[120] rounded-2xl border border-red-100 bg-white/90 px-4 py-3 text-sm font-bold text-red-600 shadow-lg shadow-red-200/40 backdrop-blur"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {isAdmin && currentScreen === Screen.List && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={navigateToAdd}
          className="fixed bottom-10 right-10 w-16 h-16 bg-red-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-red-500/40 hover:bg-red-600 hover:scale-110 transition-all z-40"
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      )}

      <Footer />
    </>
  );
}
