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

type VideoInput = {
  youtubeUrl?: unknown;
  title?: unknown;
  thumbnailUrl?: unknown;
  tags?: unknown;
  category?: unknown;
  goodPoints?: unknown;
  memo?: unknown;
  rating?: unknown;
  publishDate?: unknown;
};

type NormalizedVideo = {
  youtubeUrl?: string;
  title?: string;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
  goodPoints?: string;
  memo?: string;
  rating?: number;
  publishDate?: Date | null;
};

const MAX_TAG_LENGTH = 10;
const MAX_CATEGORY_LENGTH = 10;
const MAX_TEXT_LENGTH = 2000;

const hasField = (input: VideoInput, key: keyof VideoInput) =>
  Object.prototype.hasOwnProperty.call(input, key);

const toStringValue = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  return "";
};

const normalizeTags = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .filter((tag) => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [] as string[];
};

const parsePublishDate = (value: unknown) => {
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
};

export const validateVideoInput = (
  input: VideoInput,
  options: ValidateOptions = {}
): { data: NormalizedVideo; errors: ValidationErrors } => {
  const errors: ValidationErrors = {};
  const data: NormalizedVideo = {};
  const { partial = false } = options;

  if (!partial || hasField(input, "youtubeUrl")) {
    const youtubeUrl = toStringValue(input.youtubeUrl);
    if (!youtubeUrl) {
      errors.youtubeUrl = "YouTube URLは必須です。";
    } else {
      data.youtubeUrl = youtubeUrl;
    }
  }

  if (!partial || hasField(input, "title")) {
    const title = toStringValue(input.title);
    if (!title) {
      errors.title = "タイトルは必須です。";
    } else {
      data.title = title;
    }
  }

  if (hasField(input, "thumbnailUrl")) {
    const thumbnailUrl = toStringValue(input.thumbnailUrl);
    data.thumbnailUrl = thumbnailUrl;
  }

  if (!partial || hasField(input, "tags")) {
    const tags = normalizeTags(input.tags);
    const tooLong = tags.find((tag) => tag.length > MAX_TAG_LENGTH);
    if (tooLong) {
      errors.tags = `タグは${MAX_TAG_LENGTH}文字以内です。`;
    } else {
      data.tags = tags;
    }
  }

  if (!partial || hasField(input, "category")) {
    const category = toStringValue(input.category);
    if (category.length > MAX_CATEGORY_LENGTH) {
      errors.category = `カテゴリは${MAX_CATEGORY_LENGTH}文字以内です。`;
    } else {
      data.category = category || "未分類";
    }
  }

  if (!partial || hasField(input, "goodPoints")) {
    const goodPoints = toStringValue(input.goodPoints);
    if (goodPoints.length > MAX_TEXT_LENGTH) {
      errors.goodPoints = `良かったポイントは${MAX_TEXT_LENGTH}文字以内です。`;
    } else {
      data.goodPoints = goodPoints;
    }
  }

  if (!partial || hasField(input, "memo")) {
    const memo = toStringValue(input.memo);
    if (memo.length > MAX_TEXT_LENGTH) {
      errors.memo = `メモは${MAX_TEXT_LENGTH}文字以内です。`;
    } else {
      data.memo = memo;
    }
  }

  if (!partial || hasField(input, "rating")) {
    const ratingValue = typeof input.rating === "number" ? input.rating : Number(input.rating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      errors.rating = "評価は1〜5で入力してください。";
    } else {
      data.rating = Math.round(ratingValue);
    }
  }

  if (hasField(input, "publishDate")) {
    const publishDate = parsePublishDate(input.publishDate);
    if (publishDate !== undefined) {
      data.publishDate = publishDate;
    }
  }

  return { data, errors };
};
