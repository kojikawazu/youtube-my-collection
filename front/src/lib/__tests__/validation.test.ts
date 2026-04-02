import { describe, it, expect } from "vitest";
import { validateVideoInput } from "../validation";

const validInput = {
  youtubeUrl: "https://youtube.com/watch?v=example",
  title: "テスト動画",
  tags: ["React", "TypeScript"],
  category: "プログラミング",
  goodPoints: "良かった点",
  memo: "メモ",
  rating: 3,
};

describe("validateVideoInput", () => {
  // --- 正常系 ---

  it("should return no errors when all fields are valid", () => {
    const { errors } = validateVideoInput(validInput);
    expect(errors).toEqual({});
  });

  it("should fallback category to '未分類' when category is empty", () => {
    const { data, errors } = validateVideoInput({ ...validInput, category: "" });
    expect(errors.category).toBeUndefined();
    expect(data.category).toBe("未分類");
  });

  it("should normalize comma-separated tags string to array", () => {
    const { data } = validateVideoInput({ ...validInput, tags: "React, TypeScript" });
    expect(data.tags).toEqual(["React", "TypeScript"]);
  });

  it("should round decimal rating", () => {
    const { data } = validateVideoInput({ ...validInput, rating: 3.7 });
    expect(data.rating).toBe(4);
  });

  it("should pass publishDate null through as null", () => {
    const { data } = validateVideoInput({ ...validInput, publishDate: null });
    expect(data.publishDate).toBeNull();
  });

  it("should skip missing fields in partial mode", () => {
    const { errors } = validateVideoInput({ youtubeUrl: "https://youtube.com/watch?v=x" }, { partial: true });
    expect(errors.title).toBeUndefined();
    expect(errors.rating).toBeUndefined();
  });

  // --- 準正常系 ---

  it("should return error when youtubeUrl is empty", () => {
    const { errors } = validateVideoInput({ ...validInput, youtubeUrl: "" });
    expect(errors.youtubeUrl).toBe("YouTube URLは必須です。");
  });

  it("should return error when title is empty", () => {
    const { errors } = validateVideoInput({ ...validInput, title: "" });
    expect(errors.title).toBe("タイトルは必須です。");
  });

  it("should return error when a tag exceeds 10 characters", () => {
    const { errors } = validateVideoInput({ ...validInput, tags: ["12345678901"] });
    expect(errors.tags).toBeDefined();
  });

  it("should not return error when a tag is exactly 10 characters (boundary)", () => {
    const { errors } = validateVideoInput({ ...validInput, tags: ["1234567890"] });
    expect(errors.tags).toBeUndefined();
  });

  it("should return error when category exceeds 10 characters", () => {
    const { errors } = validateVideoInput({ ...validInput, category: "12345678901" });
    expect(errors.category).toBeDefined();
  });

  it("should return error when goodPoints exceeds 2000 characters", () => {
    const { errors } = validateVideoInput({ ...validInput, goodPoints: "a".repeat(2001) });
    expect(errors.goodPoints).toBeDefined();
  });

  it("should return error when memo exceeds 2000 characters", () => {
    const { errors } = validateVideoInput({ ...validInput, memo: "a".repeat(2001) });
    expect(errors.memo).toBeDefined();
  });

  it("should return error when rating is 0 (below minimum)", () => {
    const { errors } = validateVideoInput({ ...validInput, rating: 0 });
    expect(errors.rating).toBeDefined();
  });

  it("should return error when rating is 6 (above maximum)", () => {
    const { errors } = validateVideoInput({ ...validInput, rating: 6 });
    expect(errors.rating).toBeDefined();
  });

  it("should return error when rating is NaN", () => {
    const { errors } = validateVideoInput({ ...validInput, rating: NaN });
    expect(errors.rating).toBeDefined();
  });

  it("should return error when youtubeUrl is whitespace only", () => {
    const { errors } = validateVideoInput({ ...validInput, youtubeUrl: "   " });
    expect(errors.youtubeUrl).toBeDefined();
  });

  it("should filter empty strings from tags array", () => {
    const { data, errors } = validateVideoInput({ ...validInput, tags: ["", "React", ""] });
    expect(errors.tags).toBeUndefined();
    expect(data.tags).toEqual(["React"]);
  });

  // --- 異常系 ---

  it("should treat null tags as empty array without error", () => {
    const { data, errors } = validateVideoInput({ ...validInput, tags: null });
    expect(errors.tags).toBeUndefined();
    expect(data.tags).toEqual([]);
  });

  it("should convert numeric string rating to number", () => {
    const { data } = validateVideoInput({ ...validInput, rating: "3" });
    expect(data.rating).toBe(3);
  });

  it("should return error when rating is non-numeric string", () => {
    const { errors } = validateVideoInput({ ...validInput, rating: "abc" });
    expect(errors.rating).toBeDefined();
  });
});
