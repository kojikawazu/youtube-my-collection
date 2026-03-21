import React from "react";
import { Tag } from "lucide-react";
import { VideoItem, Category } from "@/lib/types";
import { ValidationErrors } from "@/lib/validation";
import { CATEGORIES } from "@/lib/constants";

type VideoFormProps = {
  mode: "add" | "edit";
  formData: Partial<VideoItem>;
  formErrors: ValidationErrors;
  onFormChange: (data: Partial<VideoItem>) => void;
  onErrorClear: (field: keyof ValidationErrors) => void;
  onSave: () => void;
  onCancel: () => void;
};

export const VideoForm: React.FC<VideoFormProps> = ({
  mode,
  formData,
  formErrors,
  onFormChange,
  onErrorClear,
  onSave,
  onCancel,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-red-950 tracking-tight mb-2">
          {mode === "add" ? "動画を追加" : "情報を編集"}
        </h1>
        <p className="text-red-800/50 font-medium">
          コレクションに新たな彩りを加えましょう。
        </p>
      </div>

      <div className="bg-white rounded-[3rem] p-8 sm:p-14 border border-red-50 shadow-2xl shadow-red-500/5 space-y-8">
        {[
          { label: "タイトル", key: "title", placeholder: "印象的なタイトルを...", type: "text" },
          { label: "YouTube URL", key: "youtubeUrl", placeholder: "https://...", type: "text" },
        ].map((field) => (
          <div key={field.key} className="space-y-2.5">
            <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
              {field.label}
            </label>
            <input
              type={field.type}
              value={(formData[field.key as keyof VideoItem] as string) || ""}
              onChange={(e) => {
                onFormChange({ ...formData, [field.key]: e.target.value });
                if (formErrors[field.key as keyof ValidationErrors]) {
                  onErrorClear(field.key as keyof ValidationErrors);
                }
              }}
              placeholder={field.placeholder}
              className={`w-full rounded-2xl px-6 py-4 text-red-950 outline-none transition-all placeholder:text-red-200 font-medium focus:ring-4 ${
                formErrors[field.key as keyof ValidationErrors]
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "bg-red-50/20 border border-red-100 focus:ring-red-50"
              }`}
            />
            {formErrors[field.key as keyof ValidationErrors] && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                {formErrors[field.key as keyof ValidationErrors]}
              </p>
            )}
          </div>
        ))}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
              カテゴリー
            </label>
            <select
              value={formData.category}
              onChange={(e) => {
                onFormChange({ ...formData, category: e.target.value as Category });
                if (formErrors.category) {
                  onErrorClear("category");
                }
              }}
              className={`w-full rounded-2xl px-6 py-4 text-red-950 outline-none transition-all font-medium appearance-none focus:ring-4 ${
                formErrors.category
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "bg-red-50/20 border border-red-100 focus:ring-red-50"
              }`}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {formErrors.category && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                {formErrors.category}
              </p>
            )}
          </div>
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
              評価
            </label>
            <div className="flex items-center gap-3 h-[60px]">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    onFormChange({ ...formData, rating: num });
                    if (formErrors.rating) {
                      onErrorClear("rating");
                    }
                  }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-all ${
                    formData.rating === num
                      ? "bg-red-500 text-white shadow-lg shadow-red-200"
                      : "bg-red-50/50 text-red-300 hover:bg-red-50"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            {formErrors.rating && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                {formErrors.rating}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
            タグ (カンマ区切り)
          </label>
          <div className="relative">
            <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-200" />
            <input
              type="text"
              value={formData.tags?.join(", ") || ""}
              onChange={(e) => {
                onFormChange({
                  ...formData,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                });
                if (formErrors.tags) {
                  onErrorClear("tags");
                }
              }}
              placeholder="React, デザイン..."
              className={`w-full rounded-2xl pl-14 pr-6 py-4 text-red-950 outline-none transition-all placeholder:text-red-200 font-medium focus:ring-4 ${
                formErrors.tags
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "bg-red-50/20 border border-red-100 focus:ring-red-50"
              }`}
            />
          </div>
          {formErrors.tags && (
            <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
              {formErrors.tags}
            </p>
          )}
        </div>

        {["goodPoints", "memo"].map((key) => (
          <div key={key} className="space-y-2.5">
            <label className="text-[10px] font-black text-red-800 uppercase tracking-widest ml-1">
              {key === "goodPoints" ? "良かったポイント" : "メモ"}
            </label>
            <textarea
              rows={key === "goodPoints" ? 4 : 3}
              value={(formData[key as keyof VideoItem] as string) || ""}
              onChange={(e) => {
                onFormChange({ ...formData, [key]: e.target.value });
                if (key === "goodPoints" && formErrors.goodPoints) {
                  onErrorClear("goodPoints");
                }
                if (key === "memo" && formErrors.memo) {
                  onErrorClear("memo");
                }
              }}
              maxLength={2000}
              className={`w-full rounded-[2rem] px-6 py-5 text-red-950 outline-none transition-all resize-none font-medium focus:ring-4 ${
                (key === "goodPoints" && formErrors.goodPoints) ||
                (key === "memo" && formErrors.memo)
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "bg-red-50/20 border border-red-100 focus:ring-red-50"
              }`}
            />
            {key === "goodPoints" && formErrors.goodPoints && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                {formErrors.goodPoints}
              </p>
            )}
            {key === "memo" && formErrors.memo && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm text-red-900 font-black shadow-md shadow-red-300/30">
                {formErrors.memo}
              </p>
            )}
          </div>
        ))}

        <div className="pt-10 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onSave}
            className="flex-1 bg-red-950 hover:bg-black text-white font-bold py-5 rounded-[2rem] shadow-2xl shadow-red-950/20 transition-all hover:-translate-y-1"
          >
            保存して更新
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-white border border-red-100 text-red-400 font-bold py-5 rounded-[2rem] hover:bg-red-50 transition-all"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};
