import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { VideoItem } from "@/lib/types";
import { Rating } from "@/components/Rating";
import { TagList } from "@/components/molecules/TagList";

type VideoCardProps = {
  video: VideoItem;
  isAdmin: boolean;
  onClick: (video: VideoItem) => void;
  onDelete: (id: string, title: string, e?: React.MouseEvent) => void;
};

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isAdmin,
  onClick,
  onDelete,
}) => {
  return (
    <motion.div
      layout
      key={video.id}
      onClick={() => onClick(video)}
      className="group bg-white rounded-[2rem] overflow-hidden border border-red-50/50 hover:border-red-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer relative flex flex-col"
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-800 shadow-lg uppercase tracking-widest">
          {video.category}
        </div>
        {isAdmin && (
          <button
            onClick={(e) => onDelete(video.id, video.title, e)}
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
        <div className="mb-4">
          <TagList tags={video.tags} size="sm" />
        </div>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-red-50/50">
          <Rating value={video.rating} size="sm" />
          <span className="text-[10px] font-bold text-red-200 uppercase tracking-tighter">
            {new Date(video.addedDate).toLocaleDateString("ja-JP")}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
