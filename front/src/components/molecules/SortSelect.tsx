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
      className="bg-white border border-red-100 text-red-900 text-sm rounded-2xl px-4 py-2.5 focus:ring-4 focus:ring-red-50 outline-none shadow-sm font-medium"
    >
      <option value="newest">最新の追加</option>
      <option value="future">最新の公開</option>
      <option value="rating">高評価順</option>
    </select>
  );
};
