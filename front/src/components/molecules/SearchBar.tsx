import React from "react";
import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300 group-focus-within:text-red-500 transition-colors" />
      <input
        type="text"
        placeholder="キーワードを検索..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-4 py-2.5 bg-white border border-red-100 rounded-2xl text-sm focus:ring-4 focus:ring-red-50 outline-none w-64 shadow-sm"
      />
    </div>
  );
};
