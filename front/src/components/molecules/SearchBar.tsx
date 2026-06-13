import React from "react";
import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="group relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-red-300 transition-colors group-focus-within:text-red-500" />
      <input
        type="text"
        placeholder="キーワードを検索..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-64 rounded-2xl border border-red-100 bg-white py-2.5 pr-4 pl-10 text-sm shadow-sm outline-none focus:ring-4 focus:ring-red-50"
      />
    </div>
  );
};
