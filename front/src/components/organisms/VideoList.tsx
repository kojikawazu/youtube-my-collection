import React from "react";
import { VideoItem, SortOption } from "@/lib/types";
import { VideoCard } from "@/components/organisms/VideoCard";
import { SearchBar } from "@/components/molecules/SearchBar";
import { SortSelect } from "@/components/molecules/SortSelect";
import { Pagination } from "@/components/molecules/Pagination";

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
          <SearchBar value={searchQuery} onChange={onSearchChange} />
          <SortSelect value={sortOption} onChange={onSortChange} />
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              visiblePageNumbers={visiblePageNumbers}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </div>
  );
};
