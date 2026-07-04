import React from "react";
import Image from "next/image";
import { Play, Trash2, Edit3, ChevronLeft, Youtube, Calendar } from "lucide-react";
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

/** 動画詳細画面。埋め込み・評価・タグ・Markdown メモを表示し、管理者には編集/削除を出す。 */
export const VideoDetail: React.FC<VideoDetailProps> = ({
  video,
  isAdmin,
  onBack,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-sm font-bold text-red-400 transition-all hover:text-red-600"
        >
          <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          コレクションへ
        </button>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(video)}
              className="flex items-center gap-2 rounded-full border border-red-100 bg-white px-6 py-2.5 text-xs font-bold text-red-600 shadow-sm transition-all hover:bg-red-50"
            >
              <Edit3 className="h-3.5 w-3.5" /> 編集
            </button>
            <button
              onClick={() => onDelete(video.id, video.title)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-sm transition-all hover:bg-red-500 hover:text-white"
              aria-label="削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[3rem] border border-red-50/50 bg-white shadow-2xl shadow-red-500/5">
        <div className="relative aspect-video">
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 896px"
            className="object-cover"
          />
          <a
            href={video.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="group absolute inset-0 flex items-center justify-center bg-red-950/20 transition-all hover:bg-red-950/40"
          >
            <div className="flex h-20 w-20 transform items-center justify-center rounded-full bg-white/95 shadow-2xl transition-transform group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-current text-red-500" />
            </div>
          </a>
        </div>

        <div className="p-8 sm:p-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-red-100/50 bg-red-50 px-4 py-1.5 text-xs font-bold tracking-widest text-red-600 uppercase">
                {video.category}
              </span>
              <Rating value={video.rating} size="lg" />
            </div>
            <div className="flex items-center gap-2 text-sm text-red-300">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">
                {video.publishDate
                  ? `${new Date(video.publishDate).toLocaleDateString("ja-JP")} 公開`
                  : "公開日未設定"}
              </span>
            </div>
          </div>

          <h1 className="mb-6 text-3xl leading-[1.2] font-extrabold text-red-950 sm:text-4xl">
            {video.title}
          </h1>

          <div className="mb-12">
            <TagList tags={video.tags} size="md" />
          </div>

          <div className="grid grid-cols-1 gap-10 border-t border-red-50 pt-12 md:grid-cols-2">
            <section className="space-y-4">
              <h2 className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-red-800 uppercase">
                <span className="h-px w-8 bg-red-200"></span> 良かったポイント
              </h2>
              <MarkdownRenderer content={video.goodPoints} />
            </section>
            <section className="space-y-4">
              <h2 className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-red-800 uppercase">
                <span className="h-px w-8 bg-red-200"></span> メモ
              </h2>
              <MarkdownRenderer content={video.memo} />
            </section>
          </div>

          <div className="mt-16 flex justify-center">
            <a
              href={video.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-4 rounded-[2rem] bg-red-500 px-12 py-5 font-bold text-white shadow-2xl shadow-red-500/30 transition-all hover:-translate-y-1 hover:bg-red-600"
            >
              <Youtube className="h-6 w-6" />
              <span className="text-lg">YouTube を開く</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
