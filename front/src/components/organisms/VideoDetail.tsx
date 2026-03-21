import React from "react";
import Image from "next/image";
import {
  Play,
  Trash2,
  Edit3,
  ChevronLeft,
  Youtube,
  Calendar,
} from "lucide-react";
import { VideoItem } from "@/lib/types";
import { Rating } from "@/components/atoms/Rating";
import { MarkdownRenderer } from "@/components/atoms/Markdown";
import { TagList } from "@/components/molecules/TagList";

type VideoDetailProps = {
  video: VideoItem;
  isAdmin: boolean;
  onBack: () => void;
  onEdit: (video: VideoItem) => void;
  onDelete: (id: string, title: string) => void;
};

export const VideoDetail: React.FC<VideoDetailProps> = ({
  video,
  isAdmin,
  onBack,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-600 transition-all group"
        >
          <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          コレクションへ
        </button>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(video)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-red-100 text-red-600 text-xs font-bold rounded-full hover:bg-red-50 transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" /> 編集
            </button>
            <button
              onClick={() => onDelete(video.id, video.title)}
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
          <Image src={video.thumbnailUrl} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 896px" className="object-cover" />
          <a
            href={video.youtubeUrl}
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
                {video.category}
              </span>
              <Rating value={video.rating} size="lg" />
            </div>
            <div className="flex items-center gap-2 text-red-300 text-sm">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">
                {video.publishDate
                  ? `${new Date(video.publishDate).toLocaleDateString("ja-JP")} 公開`
                  : "公開日未設定"}
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-red-950 mb-6 leading-[1.2]">
            {video.title}
          </h1>

          <div className="mb-12">
            <TagList tags={video.tags} size="md" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-red-50 pt-12">
            <section className="space-y-4">
              <h2 className="text-[10px] font-black text-red-800 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-8 h-px bg-red-200"></span> 良かったポイント
              </h2>
              <MarkdownRenderer content={video.goodPoints} />
            </section>
            <section className="space-y-4">
              <h2 className="text-[10px] font-black text-red-800 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-8 h-px bg-red-200"></span> メモ
              </h2>
              <MarkdownRenderer content={video.memo} />
            </section>
          </div>

          <div className="mt-16 flex justify-center">
            <a
              href={video.youtubeUrl}
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
    </div>
  );
};
