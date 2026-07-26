import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import type { HomeTemplateProps } from "@/types/home-template";
import { Modal } from "@/components/Modal";
import { Toast } from "@/components/molecules/Toast";
import { Header } from "@/components/organisms/Header";
import { VideoList } from "@/components/organisms/VideoList";
import { VideoDetail } from "@/components/organisms/VideoDetail";
import { VideoForm } from "@/components/organisms/VideoForm";
import { LoginScreen } from "@/components/organisms/LoginScreen";
import { Footer } from "@/components/organisms/Footer";

/**
 * ホーム画面のレイアウト定義（Atomic Design の templates 層）。
 * organisms（Header/一覧/詳細/フォーム/ログイン/Footer）と Modal・Toast・追加 FAB を配置し、
 * `currentScreen` に応じて表示する画面を切り替えるだけの presentational コンポーネント。
 * 状態・データ取得・遷移ロジックは持たず、すべて props（pages 層＝page.tsx）から注入される。
 */
export const HomeTemplate: React.FC<HomeTemplateProps> = ({
  currentScreen,
  selectedVideo,
  isAdmin,
  onNavigateList,
  onLogin,
  onLogout,
  onGoogleLogin,
  videos,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  isLoading,
  loadError,
  totalCount,
  currentPage,
  totalPages,
  visiblePageNumbers,
  onPageChange,
  onVideoClick,
  onVideoDelete,
  onVideoEdit,
  formData,
  formErrors,
  onFormChange,
  onErrorClear,
  onFormSave,
  onFormCancel,
  onAddClick,
  modalOpen,
  modalTitle,
  modalMessage,
  modalVariant,
  onModalConfirm,
  onModalClose,
  toastMessage,
}) => {
  return (
    <>
      <Header
        isAdmin={isAdmin}
        onLogout={onLogout}
        onLogin={onLogin}
        onLogoClick={onNavigateList}
      />

      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {currentScreen === "list" && (
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
                onSearchChange={onSearchChange}
                sortOption={sortOption}
                onSortChange={onSortChange}
                isLoading={isLoading}
                loadError={loadError}
                totalCount={totalCount}
                currentPage={currentPage}
                totalPages={totalPages}
                visiblePageNumbers={visiblePageNumbers}
                onPageChange={onPageChange}
                onVideoClick={onVideoClick}
                onVideoDelete={onVideoDelete}
              />
            </motion.div>
          )}

          {currentScreen === "detail" && selectedVideo && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <VideoDetail
                video={selectedVideo}
                isAdmin={isAdmin}
                onBack={onNavigateList}
                onEdit={onVideoEdit}
                onDelete={onVideoDelete}
              />
            </motion.div>
          )}

          {(currentScreen === "add" || currentScreen === "edit") && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <VideoForm
                mode={currentScreen === "add" ? "add" : "edit"}
                formData={formData}
                formErrors={formErrors}
                onFormChange={onFormChange}
                onErrorClear={onErrorClear}
                onSave={onFormSave}
                onCancel={onFormCancel}
              />
            </motion.div>
          )}

          {currentScreen === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <LoginScreen onGoogleLogin={onGoogleLogin} onBack={onNavigateList} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={onModalClose}
        title={modalTitle}
        message={modalMessage}
        onConfirm={onModalConfirm}
        variant={modalVariant}
        confirmLabel={modalVariant === "danger" ? "削除" : "保存"}
      />

      <Toast message={toastMessage} />

      {isAdmin && currentScreen === "list" && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={onAddClick}
          className="fixed right-10 bottom-10 z-40 flex h-16 w-16 items-center justify-center rounded-[2rem] bg-red-500 text-white shadow-2xl shadow-red-500/40 transition-all hover:scale-110 hover:bg-red-600"
        >
          <Plus className="h-8 w-8" />
        </motion.button>
      )}

      <Footer />
    </>
  );
};
