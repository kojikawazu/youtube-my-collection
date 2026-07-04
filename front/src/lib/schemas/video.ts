import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";

// このモジュールは「検証・型」の単一ソース。クライアントバンドルにも載るため、
// サーバー専用の OpenAPI 生成（zod-to-openapi）には依存させない。
// OpenAPI 用のメタデータ付与は `lib/openapi.ts`（サーバーのみ）で行う。

export const MAX_TAG_LENGTH = 10;
export const MAX_CATEGORY_LENGTH = 10;
export const MAX_TEXT_LENGTH = 2000;
export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** カテゴリ enum 値（プリセット + フォールバック）。 */
export const CATEGORY_VALUES = [...CATEGORIES, "未分類"] as const;

// --- 正規化ヘルパー（旧 validation.ts の挙動を踏襲） ---

/** 文字列なら trim して返し、それ以外は空文字にする（フォーム値の正規化）。 */
const toStringValue = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** タグを文字列配列へ正規化する。配列はそのまま、文字列はカンマ区切りで分割し、空要素を除く。 */
const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

/** 公開日を Date へ正規化する。null は null、無効/未指定は undefined（＝未送信扱い）。 */
const parsePublishDate = (value: unknown): Date | null | undefined => {
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
};

// --- フィールドスキーマ（メッセージは旧実装と 1:1） ---

const requiredString = (message: string) => z.preprocess(toStringValue, z.string().min(1, message));

const textField = (label: string) =>
  z.preprocess(
    toStringValue,
    z.string().max(MAX_TEXT_LENGTH, `${label}は${MAX_TEXT_LENGTH}文字以内です。`),
  );

const tagsField = z.preprocess(
  normalizeTags,
  z.array(z.string().max(MAX_TAG_LENGTH, `タグは${MAX_TAG_LENGTH}文字以内です。`)),
);

const categoryField = z
  .preprocess(
    toStringValue,
    z.string().max(MAX_CATEGORY_LENGTH, `カテゴリは${MAX_CATEGORY_LENGTH}文字以内です。`),
  )
  // 空文字は「未分類」にフォールバック
  .transform((value) => value || "未分類");

const ratingField = z
  .preprocess(
    (value) => (typeof value === "number" ? value : Number(value)),
    z.number().refine((n) => Number.isFinite(n) && n >= MIN_RATING && n <= MAX_RATING, {
      message: `評価は${MIN_RATING}〜${MAX_RATING}で入力してください。`,
    }),
  )
  // 小数は四捨五入
  .transform((n) => Math.round(n));

const publishDateField = z.preprocess(parsePublishDate, z.date().nullable().optional()).optional();

/**
 * 動画入力スキーマ（作成 / POST）。検証の正準。
 * - 公開契約の戻り値・メッセージは旧 validateVideoInput を完全踏襲。
 */
export const videoInputSchema = z.object({
  youtubeUrl: requiredString("YouTube URLは必須です。"),
  title: requiredString("タイトルは必須です。"),
  thumbnailUrl: z.preprocess(toStringValue, z.string()).optional(),
  tags: tagsField,
  category: categoryField,
  goodPoints: textField("良かったポイント"),
  memo: textField("メモ"),
  rating: ratingField,
  publishDate: publishDateField,
});

/** 更新スキーマ（PATCH）。送信されたフィールドのみ検証（旧 partial: true 相当）。 */
export const videoUpdateSchema = videoInputSchema.partial();

/** 正規化済みの動画データ（検証成功時の出力）。 */
export type NormalizedVideo = Partial<z.infer<typeof videoInputSchema>>;

/**
 * 動画レスポンススキーマ（API 出力 / VideoItem）。
 * 型 (`z.infer`) と OpenAPI の単一ソースを兼ねる。
 */
export const videoItemSchema = z.object({
  id: z.string(),
  youtubeUrl: z.string(),
  title: z.string(),
  thumbnailUrl: z.string(),
  tags: z.array(z.string()),
  category: z.enum(CATEGORY_VALUES),
  rating: z.number().int(),
  addedDate: z.string(),
  publishDate: z.string().nullable(),
  goodPoints: z.string(),
  memo: z.string(),
});
