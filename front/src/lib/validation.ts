import {
  videoInputSchema,
  videoUpdateSchema,
  type NormalizedVideo,
} from "@/lib/schemas/video";

export type ValidationErrors = {
  youtubeUrl?: string;
  title?: string;
  tags?: string;
  category?: string;
  goodPoints?: string;
  memo?: string;
  rating?: string;
};

type ValidateOptions = {
  partial?: boolean;
};

export type { NormalizedVideo };

/**
 * 動画入力を検証する。
 *
 * 内部エンジンは Zod（`schemas/video.ts`）に一本化しているが、公開契約
 * （シグネチャ・戻り値 `{ data, errors }`・エラーメッセージ）は従来実装と
 * 完全に同一に保つ。これにより Route Handler / 既存テストは無変更で動作する。
 */
export const validateVideoInput = (
  input: unknown,
  options: ValidateOptions = {}
): { data: NormalizedVideo; errors: ValidationErrors } => {
  const schema = options.partial ? videoUpdateSchema : videoInputSchema;
  const result = schema.safeParse(input ?? {});

  if (result.success) {
    return { data: result.data as NormalizedVideo, errors: {} };
  }

  // フィールドごとに先頭のメッセージだけを採用（旧実装は 1 フィールド 1 メッセージ）。
  const errors: ValidationErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      (errors as Record<string, string>)[key] = issue.message;
    }
  }

  return { data: {}, errors };
};
