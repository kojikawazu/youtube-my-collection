import React from "react";

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] overflow-hidden border border-red-50/50 shadow-sm flex flex-col">
      <div className="aspect-video bg-red-100/40 animate-pulse" />
      <div className="p-6 flex-1 flex flex-col gap-3">
        <div className="h-5 bg-red-100/50 rounded-lg w-4/5 animate-pulse" />
        <div className="h-5 bg-red-100/30 rounded-lg w-3/5 animate-pulse" />
        <div className="flex gap-2 mt-1">
          <div className="h-6 w-14 bg-red-50 rounded-full animate-pulse" />
          <div className="h-6 w-18 bg-red-50 rounded-full animate-pulse" />
          <div className="h-6 w-12 bg-red-50 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-red-50/50">
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="w-4 h-4 bg-red-100/40 rounded-sm animate-pulse"
              />
            ))}
          </div>
          <div className="h-3 w-16 bg-red-100/30 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
};
