import React from "react";
import { SortOption } from "@/lib/types";

type SortSelectProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
};

export const SortSelect: React.FC<SortSelectProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="rounded-2xl border border-red-100 bg-white px-4 py-2.5 text-sm font-medium text-red-900 shadow-sm outline-none focus:ring-4 focus:ring-red-50"
    >
      <option value="newest">最新の追加</option>
      <option value="future">最新の公開</option>
      <option value="rating">高評価順</option>
    </select>
  );
};
