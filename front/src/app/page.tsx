"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { INITIAL_VIDEOS } from "@/lib/sample-videos";
import { Rating } from "@/components/Rating";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Modal } from "@/components/Modal";
import { CATEGORIES } from "@/lib/constants";

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.List);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [videos, setVideos] = useState<VideoItem[]>(INITIAL_VIDEOS);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");

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
    setCurrentScreen(Screen.Add);
    window.scrollTo(0, 0);
  };
  const navigateToEdit = (video: VideoItem) => {
    setFormData({ ...video });
    setCurrentScreen(Screen.Edit);
    window.scrollTo(0, 0);
  };

  const openDeleteModal = (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalConfig({
      title: "動画を削除しますか？",
      message: `「${title}」を完全に削除します。`,
      variant: "danger",
      onConfirm: () => {
        setVideos((prev) => prev.filter((v) => v.id !== id));
        if (selectedVideo?.id === id) navigateToList();
      },
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.youtubeUrl) return alert("タイトルとURLは必須です");
    const saveAction = () => {
      if (currentScreen === Screen.Add) {
        const newVideo: VideoItem = {
          ...(formData as VideoItem),
          id: Date.now().toString(),
          thumbnailUrl: `https://picsum.photos/seed/${Date.now()}/640/360`,
          addedDate: new Date().toISOString(),
          publishDate: new Date().toISOString(),
        };
        setVideos([newVideo, ...videos]);
        navigateToList();
      } else {
        setVideos(
          videos.map((v) =>
            v.id === selectedVideo?.id ? ({ ...v, ...formData } as VideoItem) : v
          )
        );
        setSelectedVideo({ ...selectedVideo, ...formData } as VideoItem);
        setCurrentScreen(Screen.Detail);
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

  const filteredVideos = useMemo(() => {
    const list = videos.filter(
      (v) =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    switch (sortOption) {
      case "newest":
        return list.sort(
          (a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
        );
      case "future":
        return list.sort(
          (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
        );
      case "rating":
        return list.sort((a, b) => b.rating - a.rating);
      default:
        return list;
    }
  }, [videos, sortOption, searchQuery]);

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
                onClick={() => {
                  setIsAdmin(false);
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredVideos.map((video) => (
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
                        {new Date(selectedVideo.publishDate).toLocaleDateString("ja-JP")} 公開
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
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      className="w-full bg-red-50/20 border border-red-100 rounded-2xl px-6 py-4 text-red-950 focus:ring-4 focus:ring-red-50 outline-none transition-all placeholder:text-red-200 font-medium"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                      カテゴリー
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as Category })
                      }
                      className="w-full bg-red-50/20 border border-red-100 rounded-2xl px-6 py-4 text-red-950 focus:ring-4 focus:ring-red-50 outline-none transition-all font-medium appearance-none"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                      評価
                    </label>
                    <div className="flex items-center gap-3 h-[60px]">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setFormData({ ...formData, rating: num })}
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="React, デザイン..."
                      className="w-full bg-red-50/20 border border-red-100 rounded-2xl pl-14 pr-6 py-4 text-red-950 focus:ring-4 focus:ring-red-50 outline-none transition-all placeholder:text-red-200 font-medium"
                    />
                  </div>
                </div>

                {["goodPoints", "memo"].map((key) => (
                  <div key={key} className="space-y-2.5">
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
                      {key === "goodPoints" ? "良かったポイント" : "メモ"}
                    </label>
                    <textarea
                      rows={key === "goodPoints" ? 4 : 3}
                      value={(formData[key as keyof VideoItem] as string) || ""}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-full bg-red-50/20 border border-red-100 rounded-[2rem] px-6 py-5 text-red-950 focus:ring-4 focus:ring-red-50 outline-none transition-all resize-none font-medium"
                    />
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
                    setIsAdmin(true);
                    navigateToList();
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
