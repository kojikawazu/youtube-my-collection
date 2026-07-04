import { beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";

// 各テスト前に VideoEntry を空にし、テスト間で DB 状態が漏れないようにする。
beforeEach(async () => {
  await prisma.videoEntry.deleteMany();
});

// 全テスト後に接続を閉じ、ハングを防ぐ。
afterAll(async () => {
  await prisma.$disconnect();
});
