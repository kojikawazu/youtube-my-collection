import React from "react";
import { Search } from "lucide-react";
import { VideoItem, SortOption } from "@/lib/types";
import { VideoCard } from "@/components/organisms/VideoCard";

type VideoListProps = {
  videos: VideoItem[];
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  isLoading: boolean;
  loadError: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  visiblePageNumbers: number[];
  onPageChange: (page: number) => void;
  onVideoClick: (video: VideoItem) => void;
  onVideoDelete: (id: string, title: string, e?: React.MouseEvent) => void;
};

export const VideoList: React.FC<VideoListProps> = ({
  videos,
  isAdmin,
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
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-red-100 rounded-2xl text-sm focus:ring-4 focus:ring-red-50 outline-none w-64 shadow-sm"
            />
          </div>
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
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
              <VideoCard
                key={video.id}
                video={video}
                isAdmin={isAdmin}
                onClick={onVideoClick}
                onDelete={onVideoDelete}
              />
            ))}
          </div>

          {totalCount > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                    onClick={() => onPageChange(page)}
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
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-bold text-red-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
