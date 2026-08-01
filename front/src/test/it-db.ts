import { resolveTestDatabaseUrl } from "./database-url";

// IT の接続先。globalSetup・vitest 設定・テストの三者で同じ URL を使う唯一の真実。
// 解決とローカル限定の検証は database-url.ts に集約する（E2E と同一の入口）。
export const IT_DATABASE_URL = resolveTestDatabaseUrl("IT");
