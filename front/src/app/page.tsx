"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import {
  Play,
  Plus,
  Trash2,
  Edit3,
  ChevronLeft,
  LogIn,
  LogOut,
  Search,
  Youtube,
  Tag,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Screen, VideoItem, SortOption, Category } from "@/lib/types";
import { Rating } from "@/components/Rating";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Modal } from "@/components/Modal";
import { CATEGORIES } from "@/lib/constants";
import { getYoutubeThumbnail } from "@/lib/youtube";
import { ValidationErrors, validateVideoInput } from "@/lib/validation";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

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
    onConfirm: () => void;
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
      await signOut();
      setAccessToken(null);
      setIsAdmin(false);
      setCurrentScreen(Screen.List);
      showToast("このアカウントは権限がありません。");
      authRejectRef.current = false;
    };

    const applySession = async (session: Session | null) => {
      if (!session?.access_token) {
        setAccessToken(null);
        setIsAdmin(false);
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
      await applySession(data.session);
    };
    void initSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
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
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ id }),
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
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-red-50 py-4 px-6 flex items-center justify-between">
        <div onClick={navigateToList} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200 transition-transform group-hover:scale-110">
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-red-950 tracking-tight text-xl">MyYouTubeHub</span>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                <span className="text-[10px] font-bold text-red-900 uppercase tracking-widest">
                  管理者
                </span>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  setIsAdmin(false);
                  setAccessToken(null);
                  navigateToList();
                }}
                className="text-sm font-bold text-red-400 hover:text-red-600 p-2"
                aria-label="ログアウト"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentScreen(Screen.Login)}
              className="p-2 text-red-400 hover:text-red-600 transition-colors"
              aria-label="ログイン"
            >
              <LogIn className="w-5 h-5" />
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {currentScreen === Screen.List && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 py-10"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div className="space-y-1">
                  <h1 className="text-4xl font-extrabold text-red-950 tracking-tight">
                    コレクション
                  </h1>
                  <p className="text-red-800/50 font-medium">
                    お気に入りの動画を整理して、いつでも見返そう。
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300 group-focus-within:text-red-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="キーワードを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-white border border-red-100 rounded-2xl text-sm focus:ring-4 focus:ring-red-50 outline-none w-64 shadow-sm"
                    />
                  </div>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="bg-white border border-red-100 text-red-900 text-sm rounded-2xl px-4 py-2.5 focus:ring-4 focus:ring-red-50 outline-none shadow-sm font-medium"
                  >
                    <option value="newest">最新の追加</option>
                    <option value="future">最新の公開</option>
                    <option value="rating">高評価順</option>
                  </select>
                </div>
              </div>

              {loadError && (
                <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 text-sm text-red-700">
                  {loadError}
                </div>
              )}
              {isLoading ? (
                <div className="rounded-[2rem] border border-red-50/50 bg-white/80 p-12 text-center text-sm text-red-400">
                  読み込み中...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {videos.map((video) => (
                      <motion.div
                        layout
                        key={video.id}
                        onClick={() => navigateToDetail(video)}
                        className="group bg-white rounded-[2rem] overflow-hidden border border-red-50/50 hover:border-red-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer relative flex flex-col"
                      >
                        <div className="relative aspect-video overflow-hidden">
                          <img
                            src={video.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-800 shadow-lg uppercase tracking-widest">
                            {video.category}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={(e) => openDeleteModal(video.id, video.title, e)}
                              className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded-full transition-all hover:bg-red-600 shadow-lg shadow-red-500/20 z-10"
                              aria-label="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="font-bold text-red-950 text-lg mb-3 line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                            {video.title}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {video.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-2.5 py-1 bg-red-50 text-red-600 rounded-lg font-bold"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-red-50/50">
                            <Rating value={video.rating} size="sm" />
                            <span className="text-[10px] font-bold text-red-200 uppercase tracking-tighter">
                              {new Date(video.addedDate).toLocaleDateString("ja-JP")}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {totalCount > 0 && (
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                        className="rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        前へ
                      </button>

                      <div className="flex items-center gap-1">
                        {visiblePageNumbers.map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`h-9 min-w-9 rounded-xl border px-3 text-xs font-bold transition ${
                              page === currentPage
                                ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-200"
                                : "border-red-100 bg-white text-red-700 hover:border-red-200 hover:bg-red-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <span className="rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-700 shadow-sm">
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                        className="rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        次へ
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {currentScreen === Screen.Detail && selectedVideo && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto px-4 sm:px-6 py-10"
            >
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={navigateToList}
                  className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-600 transition-all group"
                >
                  <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                  コレクションへ
                </button>
                {isAdmin && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigateToEdit(selectedVideo)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white border border-red-100 text-red-600 text-xs font-bold rounded-full hover:bg-red-50 transition-all shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> 編集
                    </button>
                    <button
                      onClick={() => openDeleteModal(selectedVideo.id, selectedVideo.title)}
                      className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-[3rem] overflow-hidden border border-red-50/50 shadow-2xl shadow-red-500/5">
                <div className="relative aspect-video">
                  <img src={selectedVideo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  <a
                    href={selectedVideo.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-red-950/20 hover:bg-red-950/40 transition-all group"
                  >
                    <div className="w-20 h-20 bg-white/95 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-red-500 fill-current ml-1" />
                    </div>
                  </a>
                </div>

                <div className="p-8 sm:p-14">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-100/50">
                        {selectedVideo.category}
                      </span>
                      <Rating value={selectedVideo.rating} size="lg" />
                    </div>
                    <div className="flex items-center gap-2 text-red-300 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">
                        {selectedVideo.publishDate
                          ? `${new Date(selectedVideo.publishDate).toLocaleDateString("ja-JP")} 公開`
                          : "公開日未設定"}
                      </span>
                    </div>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-extrabold text-red-950 mb-6 leading-[1.2]">
                    {selectedVideo.title}
                  </h1>

                  <div className="flex flex-wrap gap-2 mb-12">
                    {selectedVideo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-bold text-red-400 bg-red-50/30 px-3 py-1.5 rounded-xl border border-red-100/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-red-50 pt-12">
                    <section className="space-y-4">
                      <h2 className="text-[10px] font-black text-red-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="w-8 h-px bg-red-200"></span> 良かったポイント
                      </h2>
                      <MarkdownRenderer content={selectedVideo.goodPoints} />
                    </section>
                    <section className="space-y-4">
                      <h2 className="text-[10px] font-black text-red-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="w-8 h-px bg-red-200"></span> メモ
                      </h2>
                      <MarkdownRenderer content={selectedVideo.memo} />
                    </section>
                  </div>

                  <div className="mt-16 flex justify-center">
                    <a
                      href={selectedVideo.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-4 bg-red-500 hover:bg-red-600 text-white font-bold px-12 py-5 rounded-[2rem] shadow-2xl shadow-red-500/30 transition-all hover:-translate-y-1"
                    >
                      <Youtube className="w-6 h-6" />
                      <span className="text-lg">YouTube を開く</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(currentScreen === Screen.Add || currentScreen === Screen.Edit) && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-3xl mx-auto px-4 sm:px-6 py-10"
            >
              <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-red-950 tracking-tight mb-2">
                  {currentScreen === Screen.Add ? "動画を追加" : "情報を編集"}
                </h1>
                <p className="text-red-800/50 font-medium">
                  コレクションに新たな彩りを加えましょう。
                </p>
              </div>

              <div className="bg-white rounded-[3rem] p-8 sm:p-14 border border-red-50 shadow-2xl shadow-red-500/5 space-y-8">
                {[
                  { label: "タイトル", key: "title", placeholder: "印象的なタイトルを...", type: "text" },
                  { label: "YouTube URL", key: "youtubeUrl", placeholder: "https://...", type: "text" },
                ].map((field) => (
                  <div key={field.key} className="space-y-2.5">
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={(formData[field.key as keyof VideoItem] as string) || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, [field.key]: e.target.value });
                        if (formErrors[field.key as keyof ValidationErrors]) {
                          setFormErrors((prev) => ({ ...prev, [field.key]: undefined }));
                        }
                      }}
                      placeholder={field.placeholder}
                      className={`w-full rounded-2xl px-6 py-4 text-red-950 outline-none transition-all placeholder:text-red-200 font-medium focus:ring-4 ${
                        formErrors[field.key as keyof ValidationErrors]
                          ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                          : "bg-red-50/20 border border-red-100 focus:ring-red-50"
                      }`}
                    />
                    {formErrors[field.key as keyof ValidationErrors] && (
                      <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                        {formErrors[field.key as keyof ValidationErrors]}
                      </p>
                    )}
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                      カテゴリー
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        setFormData({ ...formData, category: e.target.value as Category });
                        if (formErrors.category) {
                          setFormErrors((prev) => ({ ...prev, category: undefined }));
                        }
                      }}
                      className={`w-full rounded-2xl px-6 py-4 text-red-950 outline-none transition-all font-medium appearance-none focus:ring-4 ${
                        formErrors.category
                          ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                          : "bg-red-50/20 border border-red-100 focus:ring-red-50"
                      }`}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                        {formErrors.category}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                      評価
                    </label>
                    <div className="flex items-center gap-3 h-[60px]">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setFormData({ ...formData, rating: num });
                            if (formErrors.rating) {
                              setFormErrors((prev) => ({ ...prev, rating: undefined }));
                            }
                          }}
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-all ${
                            formData.rating === num
                              ? "bg-red-500 text-white shadow-lg shadow-red-200"
                              : "bg-red-50/50 text-red-300 hover:bg-red-50"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    {formErrors.rating && (
                      <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                        {formErrors.rating}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                    タグ (カンマ区切り)
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-200" />
                    <input
                      type="text"
                      value={formData.tags?.join(", ") || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        });
                        if (formErrors.tags) {
                          setFormErrors((prev) => ({ ...prev, tags: undefined }));
                        }
                      }}
                      placeholder="React, デザイン..."
                      className={`w-full rounded-2xl pl-14 pr-6 py-4 text-red-950 outline-none transition-all placeholder:text-red-200 font-medium focus:ring-4 ${
                        formErrors.tags
                          ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                          : "bg-red-50/20 border border-red-100 focus:ring-red-50"
                      }`}
                    />
                  </div>
                  {formErrors.tags && (
                    <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                      {formErrors.tags}
                    </p>
                  )}
                </div>

                {["goodPoints", "memo"].map((key) => (
                  <div key={key} className="space-y-2.5">
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                      {key === "goodPoints" ? "良かったポイント" : "メモ"}
                    </label>
                    <textarea
                      rows={key === "goodPoints" ? 4 : 3}
                      value={(formData[key as keyof VideoItem] as string) || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, [key]: e.target.value });
                        if (key === "goodPoints" && formErrors.goodPoints) {
                          setFormErrors((prev) => ({ ...prev, goodPoints: undefined }));
                        }
                        if (key === "memo" && formErrors.memo) {
                          setFormErrors((prev) => ({ ...prev, memo: undefined }));
                        }
                      }}
                      maxLength={2000}
                      className={`w-full rounded-[2rem] px-6 py-5 text-red-950 outline-none transition-all resize-none font-medium focus:ring-4 ${
                        (key === "goodPoints" && formErrors.goodPoints) ||
                        (key === "memo" && formErrors.memo)
                          ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                          : "bg-red-50/20 border border-red-100 focus:ring-red-50"
                      }`}
                    />
                    {key === "goodPoints" && formErrors.goodPoints && (
                      <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                        {formErrors.goodPoints}
                      </p>
                    )}
                    {key === "memo" && formErrors.memo && (
                      <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                        {formErrors.memo}
                      </p>
                    )}
                  </div>
                ))}

                <div className="pt-10 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-red-950 hover:bg-black text-white font-bold py-5 rounded-[2rem] shadow-2xl shadow-red-950/20 transition-all hover:-translate-y-1"
                  >
                    保存して更新
                  </button>
                  <button
                    onClick={() =>
                      currentScreen === Screen.Add
                        ? navigateToList()
                        : navigateToDetail(selectedVideo!)
                    }
                    className="flex-1 bg-white border border-red-100 text-red-400 font-bold py-5 rounded-[2rem] hover:bg-red-50 transition-all"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentScreen === Screen.Login && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="min-h-[80vh] flex items-center justify-center px-4"
            >
              <div className="w-full max-w-md bg-white rounded-[3.5rem] border border-red-50 shadow-2xl shadow-red-500/5 p-10 sm:p-16 text-center">
                <div className="mb-10 relative inline-block">
                  <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-12 h-12 text-red-500" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 border-4 border-white rounded-full flex items-center justify-center"
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </motion.div>
                </div>

                <h1 className="text-3xl font-extrabold text-red-950 mb-3 tracking-tight">
                  管理者ログイン
                </h1>
                <p className="text-sm text-red-800/40 mb-12 font-medium leading-relaxed">
                  管理権限が必要です。<br />Googleアカウントで認証してください。
                </p>

                <button
                  onClick={() => {
                    signInWithGoogle();
                  }}
                  className="w-full flex items-center justify-center gap-4 bg-white border border-gray-100 hover:border-red-200 hover:bg-red-50 text-gray-700 font-bold py-5 px-8 rounded-[2rem] transition-all shadow-sm mb-8 group"
                >
                  <svg
                    className="w-6 h-6 group-hover:scale-110 transition-transform"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  Googleでログイン
                </button>

                <button
                  onClick={navigateToList}
                  className="text-sm font-bold text-red-300 hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  コレクションへ戻る
                </button>
              </div>
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

      <footer className="py-12 px-6 text-center border-t border-red-50">
        <div className="flex items-center justify-center gap-2 text-red-950 font-bold mb-2 opacity-30">
          <Youtube className="w-4 h-4" />
          <span className="text-sm uppercase tracking-widest">MyYouTubeHub コレクション</span>
        </div>
        <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest">
          © 2024 個人用ライブラリ
        </p>
      </footer>
    </>
  );
}
