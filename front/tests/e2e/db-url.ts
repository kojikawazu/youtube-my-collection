import { resolveTestDatabaseUrl } from "../../src/test/database-url";

// E2E の webServer / seed / migrate が共有するテスト DB 接続先。
// 解決とローカル限定の検証は database-url.ts に集約する（IT と同一の入口）。
export const E2E_DATABASE_URL = resolveTestDatabaseUrl("E2E");
