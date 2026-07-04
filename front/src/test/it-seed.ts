import { prisma } from "@/lib/db";

/**
 * IT 用に VideoEntry を 1 件挿入する。既定値を持ち、必要なフィールドだけ上書きできる。
 * createdAt / rating / publishDate を上書きすると並び替え・絞り込みの検証がしやすい。
 * @param overrides 既定値を差し替えるフィールド（Prisma の VideoEntry 作成入力の部分集合）
 * @returns 挿入された VideoEntry レコード
 */
export function seedVideo(
  overrides: Partial<Parameters<typeof prisma.videoEntry.create>[0]["data"]> = {},
) {
  return prisma.videoEntry.create({
    data: {
      youtubeUrl: "https://youtu.be/abcdef",
      title: "seed video",
      thumbnailUrl: "https://img.youtube.com/vi/abcdef/hqdefault.jpg",
      tags: [],
      category: "プログラミング",
      goodPoints: "",
      memo: "",
      rating: 3,
      publishDate: null,
      ...overrides,
    },
  });
}
