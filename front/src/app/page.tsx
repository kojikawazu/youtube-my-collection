"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import { Plus } from "lucide-react";
import { Screen, VideoItem, SortOption } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { getYoutubeThumbnail } from "@/lib/youtube";
import { ValidationErrors, validateVideoInput } from "@/lib/validation";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { Header } from "@/components/organisms/Header";
import { VideoList } from "@/components/organisms/VideoList";
import { VideoDetail } from "@/components/organisms/VideoDetail";
import { VideoForm } from "@/components/organisms/VideoForm";
import { LoginScreen } from "@/components/organisms/LoginScreen";
import { Footer } from "@/components/organisms/Footer";

const PAGE_SIZE = 10;
const MAX_VISIBLE_PAGE_BUTTONS = 5;

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.List);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authRejectRef = useRef(false);
  const lastAppliedFiltersRef = useRef({
    sortOption,
    debouncedSearchQuery,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant: "danger" | "info";
  }>({
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "info",
  });

  const [formData, setFormData] = useState<Partial<VideoItem>>({});
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const loadVideos = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String((page - 1) * PAGE_SIZE),
          order: "desc",
          sort:
            sortOption === "future" ? "published" : sortOption === "rating" ? "rating" : "added",
        });
        if (debouncedSearchQuery) {
          params.set("q", debouncedSearchQuery);
        }

        const response = await fetch(`/api/videos?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load videos");
        }

        const data = (await response.json()) as VideoItem[];
        const totalCountHeader = response.headers.get("x-total-count");
        const parsedTotalCount = totalCountHeader ? Number(totalCountHeader) : NaN;
        setVideos(data);
        setTotalCount(
          Number.isFinite(parsedTotalCount) && parsedTotalCount >= 0 ? parsedTotalCount : data.length
        );
      } catch (error) {
        console.error(error);
        setLoadError("データの取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    },
    [sortOption, debouncedSearchQuery]
  );

  const refreshListPage = useCallback(
    async (page: number) => {
      if (page === currentPage) {
        await loadVideos(page);
        return;
      }
      setCurrentPage(page);
    },
    [currentPage, loadVideos]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const prev = lastAppliedFiltersRef.current;
    const filtersChanged =
      prev.sortOption !== sortOption || prev.debouncedSearchQuery !== debouncedSearchQuery;

    lastAppliedFiltersRef.current = { sortOption, debouncedSearchQuery };

    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    void loadVideos(currentPage);
  }, [currentPage, sortOption, debouncedSearchQuery, loadVideos]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const verifyAdminSession = async (token: string) => {
    try {
      const response = await fetch("/api/auth/admin", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { isAdmin?: boolean };
      return Boolean(data.isAdmin);
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  useEffect(() => {
    const rejectNonAdmin = async () => {
      if (authRejectRef.current) return;
      authRejectRef.current = true;
      try {
        await signOut();
      } catch {
        // Ignore signOut errors (e.g. expired token → 403)
      }
      setAccessToken(null);
      setIsAdmin(false);
      setCurrentScreen(Screen.List);
      showToast("このアカウントは権限がありません。");
      authRejectRef.current = false;
    };

    const clearSession = () => {
      setAccessToken(null);
      setIsAdmin(false);
    };

    const applySession = async (session: Session | null) => {
      if (!session?.access_token) {
        clearSession();
        return;
      }

      const token = session.access_token;
      const isAllowed = await verifyAdminSession(token);
      if (isAllowed) {
        setAccessToken(token);
        setIsAdmin(true);
        return;
      }

      await rejectNonAdmin();
    };

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        clearSession();
        return;
      }
      await applySession(data.session);
    };
    void initSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearSession();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void applySession(session);
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

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
    setCurrentScreen(Screen.Add);
    window.scrollTo(0, 0);
  };
  const navigateToEdit = (video: VideoItem) => {
    setFormData({ ...video });
    setFormErrors({});
    setCurrentScreen(Screen.Edit);
    window.scrollTo(0, 0);
  };

  const openDeleteModal = (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalConfig({
      title: "動画を削除しますか？",
      message: `「${title}」を完全に削除します。`,
      variant: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/videos/${id}`, {
            method: "DELETE",
            headers: {
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          });
          if (!response.ok) {
            throw new Error("Failed to delete");
          }

          if (selectedVideo?.id === id) {
            navigateToList();
          }

          const nextTotalCount = Math.max(totalCount - 1, 0);
          const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / PAGE_SIZE));
          const nextPage = Math.min(currentPage, nextTotalPages);
          await refreshListPage(nextPage);
          showToast("削除しました。");
        } catch (error) {
          console.error(error);
          alert("削除に失敗しました。");
          throw error;
        }
      },
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const { errors } = validateVideoInput(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    const saveAction = async () => {
      if (currentScreen === Screen.Add) {
        try {
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
          navigateToList();
          await refreshListPage(1);
          showToast("追加しました。");
        } catch (error) {
          console.error(error);
          alert("保存に失敗しました。");
          throw error;
        }
      } else {
        try {
          const targetId = formData.id ?? selectedVideo?.id;
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
          setSelectedVideo(updated);
          await refreshListPage(currentPage);
          setCurrentScreen(Screen.Detail);
          showToast("更新しました。");
        } catch (error) {
          console.error(error);
          alert(`更新に失敗しました。${error instanceof Error ? error.message : ""}`);
          throw error;
        }
      }
    };
    setModalConfig({
      title: "変更を保存しますか？",
      message: "入力内容で更新します。",
      variant: "info",
      onConfirm: saveAction,
    });
    setIsModalOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const visiblePageNumbers = useMemo(() => {
    const startCentered = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGE_BUTTONS / 2));
    let end = startCentered + MAX_VISIBLE_PAGE_BUTTONS - 1;
    if (end > totalPages) {
      end = totalPages;
    }
    const start = Math.max(1, end - MAX_VISIBLE_PAGE_BUTTONS + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  return (
    <>
      <Header
        isAdmin={isAdmin}
        onLogout={async () => {
          try {
            await signOut();
          } catch {
            // signOut failure should not block state cleanup
          }
          setIsAdmin(false);
          setAccessToken(null);
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
                onVideoDelete={openDeleteModal}
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
                onDelete={openDeleteModal}
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
                formData={formData}
                formErrors={formErrors}
                onFormChange={setFormData}
                onErrorClear={(field) =>
                  setFormErrors((prev) => ({ ...prev, [field]: undefined }))
                }
                onSave={handleSave}
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
              <LoginScreen
                onGoogleLogin={() => signInWithGoogle()}
                onBack={navigateToList}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        variant={modalConfig.variant}
        confirmLabel={modalConfig.variant === "danger" ? "削除" : "保存"}
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
