import React from "react";

export const SkeletonCard: React.FC = () => {
  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-red-50/50 bg-white shadow-sm">
      <div className="aspect-video animate-pulse bg-red-100/40" />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-red-100/50" />
        <div className="h-5 w-3/5 animate-pulse rounded-lg bg-red-100/30" />
        <div className="mt-1 flex gap-2">
          <div className="h-6 w-14 animate-pulse rounded-full bg-red-50" />
          <div className="h-6 w-18 animate-pulse rounded-full bg-red-50" />
          <div className="h-6 w-12 animate-pulse rounded-full bg-red-50" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-red-50/50 pt-4">
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-4 w-4 animate-pulse rounded-sm bg-red-100/40" />
            ))}
          </div>
          <div className="h-3 w-16 animate-pulse rounded-lg bg-red-100/30" />
        </div>
      </div>
    </div>
  );
};
