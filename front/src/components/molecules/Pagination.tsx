import React from "react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  visiblePageNumbers: number[];
  onPageChange: (page: number) => void;
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  visiblePageNumbers,
  onPageChange,
}) => {
  return (
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
  );
};
