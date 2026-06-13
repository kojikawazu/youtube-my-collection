import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { VideoItem } from "@/lib/types";
import { Rating } from "@/components/atoms/Rating";
import { TagList } from "@/components/molecules/TagList";

type VideoCardProps = {
  video: VideoItem;
  isAdmin: boolean;
  onClick: (video: VideoItem) => void;
  onDelete: (id: string, title: string, e?: React.MouseEvent) => void;
};

export const VideoCard: React.FC<VideoCardProps> = ({ video, isAdmin, onClick, onDelete }) => {
  return (
    <motion.div
      layout
      key={video.id}
      onClick={() => onClick(video)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-red-50/50 bg-white shadow-sm transition-all hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10"
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 rounded-xl bg-white/95 px-3 py-1.5 text-[10px] font-bold tracking-widest text-red-800 uppercase shadow-lg backdrop-blur">
          {video.category}
        </div>
        {isAdmin && (
          <button
            onClick={(e) => onDelete(video.id, video.title, e)}
            className="absolute top-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
            aria-label="削除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-3 line-clamp-2 text-lg leading-tight font-bold text-red-950 transition-colors group-hover:text-red-500">
          {video.title}
        </h3>
        <div className="mb-4">
          <TagList tags={video.tags} size="sm" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-red-50/50 pt-4">
          <Rating value={video.rating} size="sm" />
          <span className="text-[10px] font-bold tracking-tighter text-red-200 uppercase">
            {new Date(video.addedDate).toLocaleDateString("ja-JP")}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
