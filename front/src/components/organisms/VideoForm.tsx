import React from "react";
import { Tag } from "lucide-react";
import { VideoItem, Category } from "@/types";
import { ValidationErrors } from "@/lib/validation";
import { CATEGORIES } from "@/constants";

type VideoFormProps = {
  mode: "add" | "edit";
  formData: Partial<VideoItem>;
  formErrors: ValidationErrors;
  onFormChange: (data: Partial<VideoItem>) => void;
  onErrorClear: (field: keyof ValidationErrors) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** 動画の追加/編集フォーム（`mode` で切替）。入力とフィールド単位のエラー表示を担う。 */
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-red-950">
          {mode === "add" ? "動画を追加" : "情報を編集"}
        </h1>
        <p className="font-medium text-red-800/50">コレクションに新たな彩りを加えましょう。</p>
      </div>

      <div className="space-y-8 rounded-[3rem] border border-red-50 bg-white p-8 shadow-2xl shadow-red-500/5 sm:p-14">
        {[
          { label: "タイトル", key: "title", placeholder: "印象的なタイトルを...", type: "text" },
          { label: "YouTube URL", key: "youtubeUrl", placeholder: "https://...", type: "text" },
        ].map((field) => (
          <div key={field.key} className="space-y-2.5">
            <label className="ml-1 text-[10px] font-black tracking-widest text-red-800 uppercase">
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
              className={`w-full rounded-2xl px-6 py-4 font-medium text-red-950 transition-all outline-none placeholder:text-red-200 focus:ring-4 ${
                formErrors[field.key as keyof ValidationErrors]
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "border border-red-100 bg-red-50/20 focus:ring-red-50"
              }`}
            />
            {formErrors[field.key as keyof ValidationErrors] && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm font-black text-red-900 shadow-md shadow-red-300/30">
                {formErrors[field.key as keyof ValidationErrors]}
              </p>
            )}
          </div>
        ))}

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="space-y-2.5">
            <label className="ml-1 text-[10px] font-black tracking-widest text-red-800 uppercase">
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
              className={`w-full appearance-none rounded-2xl px-6 py-4 font-medium text-red-950 transition-all outline-none focus:ring-4 ${
                formErrors.category
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "border border-red-100 bg-red-50/20 focus:ring-red-50"
              }`}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {formErrors.category && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm font-black text-red-900 shadow-md shadow-red-300/30">
                {formErrors.category}
              </p>
            )}
          </div>
          <div className="space-y-2.5">
            <label className="ml-1 text-[10px] font-black tracking-widest text-red-800 uppercase">
              評価
            </label>
            <div className="flex h-[60px] items-center gap-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    onFormChange({ ...formData, rating: num });
                    if (formErrors.rating) {
                      onErrorClear("rating");
                    }
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl font-bold transition-all ${
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
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm font-black text-red-900 shadow-md shadow-red-300/30">
                {formErrors.rating}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="ml-1 text-[10px] font-black tracking-widest text-red-800 uppercase">
            タグ (カンマ区切り)
          </label>
          <div className="relative">
            <Tag className="absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-red-200" />
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
              className={`w-full rounded-2xl py-4 pr-6 pl-14 font-medium text-red-950 transition-all outline-none placeholder:text-red-200 focus:ring-4 ${
                formErrors.tags
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "border border-red-100 bg-red-50/20 focus:ring-red-50"
              }`}
            />
          </div>
          {formErrors.tags && (
            <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm font-black text-red-900 shadow-md shadow-red-300/30">
              {formErrors.tags}
            </p>
          )}
        </div>

        {["goodPoints", "memo"].map((key) => (
          <div key={key} className="space-y-2.5">
            <label className="ml-1 text-[10px] font-black tracking-widest text-red-800 uppercase">
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
              className={`w-full resize-none rounded-[2rem] px-6 py-5 font-medium text-red-950 transition-all outline-none focus:ring-4 ${
                (key === "goodPoints" && formErrors.goodPoints) ||
                (key === "memo" && formErrors.memo)
                  ? "border border-red-300 bg-red-50/70 focus:ring-red-200"
                  : "border border-red-100 bg-red-50/20 focus:ring-red-50"
              }`}
            />
            {key === "goodPoints" && formErrors.goodPoints && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm font-black text-red-900 shadow-md shadow-red-300/30">
                {formErrors.goodPoints}
              </p>
            )}
            {key === "memo" && formErrors.memo && (
              <p className="mt-3 rounded-xl border border-red-400 bg-red-200 px-4 py-2 text-sm font-black text-red-900 shadow-md shadow-red-300/30">
                {formErrors.memo}
              </p>
            )}
          </div>
        ))}

        <div className="flex flex-col gap-4 pt-10 sm:flex-row">
          <button
            onClick={onSave}
            className="flex-1 rounded-[2rem] bg-red-950 py-5 font-bold text-white shadow-2xl shadow-red-950/20 transition-all hover:-translate-y-1 hover:bg-black"
          >
            保存して更新
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-[2rem] border border-red-100 bg-white py-5 font-bold text-red-400 transition-all hover:bg-red-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};
