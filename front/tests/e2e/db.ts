import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { assertLocalDatabaseUrl } from "../../src/test/database-url";
import type { MockVideo } from "./helpers";
import { E2E_DATABASE_URL } from "./db-url";

// Prisma に渡す接続先。seedVideos の全削除直前にも同じ値を検証するため、変数として保持する。
const connectionString = E2E_DATABASE_URL;

// テスト DB 専用の Prisma クライアント。webServer とは別プロセスだが同じ Postgres を指す。
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * テスト DB を指定データセットで作り直す（全削除 → 一括投入）。
 * fixture の addedDate/publishDate を createdAt/publishDate に写し、実 route の並び替えを再現する。
 * @param videos 投入する動画（空配列なら空 DB にする）
 * @returns 投入完了を表す Promise
 */
export async function seedVideos(videos: MockVideo[]) {
  // 全削除の直前に、Prisma へ渡した接続先がローカルかを検証する（本番破壊の最終防衛線）。
  assertLocalDatabaseUrl(connectionString, "E2E");
  await prisma.videoEntry.deleteMany();
  if (videos.length === 0) return;
  await prisma.videoEntry.createMany({
    data: videos.map((v) => ({
      youtubeUrl: v.youtubeUrl,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      tags: v.tags,
      category: v.category,
      goodPoints: v.goodPoints,
      memo: v.memo,
      rating: v.rating,
      createdAt: new Date(v.addedDate),
      publishDate: v.publishDate ? new Date(v.publishDate) : null,
    })),
  });
}

/**
 * テスト DB 接続を閉じる（全テスト後に呼び、ワーカーのハングを防ぐ）。
 * @returns 切断完了を表す Promise
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}
