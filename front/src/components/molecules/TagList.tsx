import React from "react";

type TagListProps = {
  tags: string[];
  size?: "sm" | "md";
};

const sizeStyles = {
  sm: "text-[10px] px-2.5 py-1 bg-red-50 text-red-600 rounded-lg font-bold",
  md: "text-xs font-bold text-red-400 bg-red-50/30 px-3 py-1.5 rounded-xl border border-red-100/30",
};

export const TagList: React.FC<TagListProps> = ({ tags, size = "sm" }) => {
  return (
    <div className={`flex flex-wrap ${size === "sm" ? "gap-1.5" : "gap-2"}`}>
      {tags.map((tag) => (
        <span key={tag} className={sizeStyles[size]}>
          #{tag}
        </span>
      ))}
    </div>
  );
};
