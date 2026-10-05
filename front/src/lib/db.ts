// Prisma クライアントは DATABASE_URL で DB へ直接接続する。Client Component から
// 引き込まれるとビルド時にエラーになるよう server-only で境界を機械的に守る。
import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

/**
 * 接続先を明示した PrismaClient を生成する。
 * Prisma 7 は `.env` を自動で読まず driver adapter 経由で接続するため、URL をここで渡す。
 * 値は Next.js が読み込む `.env.local`（本番は Vercel の環境変数）、IT では Vitest の `test.env` が与える。
 * @returns DATABASE_URL に接続する PrismaClient
 */
const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: ["error"],
  });

/**
 * アプリ共有の PrismaClient シングルトン。
 * 開発時の HMR で接続が増え続けないよう globalThis にキャッシュする（本番では都度生成）。
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
