import { beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { assertLocalDatabaseUrl } from "./database-url";

// 各テスト前に VideoEntry を空にし、テスト間で DB 状態が漏れないようにする。
// 全削除の直前に、lib/db が接続に使う DATABASE_URL がローカルかを毎回検証する（本番破壊の最終防衛線）。
beforeEach(async () => {
  assertLocalDatabaseUrl(process.env.DATABASE_URL, "IT");
  await prisma.videoEntry.deleteMany();
});

// 全テスト後に接続を閉じ、ハングを防ぐ。
afterAll(async () => {
  await prisma.$disconnect();
});
