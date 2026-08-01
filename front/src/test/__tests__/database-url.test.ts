import { describe, it, expect, afterEach } from "vitest";
import { resolveTestDatabaseUrl } from "../database-url";

const ORIGINAL = process.env.TEST_DATABASE_URL;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.TEST_DATABASE_URL;
  } else {
    process.env.TEST_DATABASE_URL = ORIGINAL;
  }
  delete process.env.DATABASE_URL;
});

describe("resolveTestDatabaseUrl", () => {
  // --- 正常系 ---

  it("未指定ならローカルのテスト DB を既定にする", () => {
    delete process.env.TEST_DATABASE_URL;
    expect(resolveTestDatabaseUrl("IT")).toBe(
      "postgresql://postgres:postgres@localhost:5432/ymc_test?schema=public",
    );
  });

  it("TEST_DATABASE_URL が localhost なら採用する", () => {
    process.env.TEST_DATABASE_URL = "postgresql://u:p@localhost:15432/other?schema=public";
    expect(resolveTestDatabaseUrl("IT")).toBe(
      "postgresql://u:p@localhost:15432/other?schema=public",
    );
  });

  it("127.0.0.1 も許可する", () => {
    process.env.TEST_DATABASE_URL = "postgresql://u:p@127.0.0.1:5432/ymc_test";
    expect(resolveTestDatabaseUrl("E2E")).toBe("postgresql://u:p@127.0.0.1:5432/ymc_test");
  });

  // --- 準正常系 ---

  it("URL として解釈できなければ失敗する", () => {
    process.env.TEST_DATABASE_URL = "not a url";
    expect(() => resolveTestDatabaseUrl("IT")).toThrow(/URL として解釈できません/);
  });

  // --- 異常系（本番 DB 破壊の防止） ---

  it("DATABASE_URL に本番 URL が入っていても参照しない（.env 汚染への耐性）", () => {
    // @prisma/client の import で .env が読み込まれ、DATABASE_URL が本番になる状況を再現する。
    process.env.DATABASE_URL = "postgresql://u:p@db.pooler.example.com:5432/postgres";
    delete process.env.TEST_DATABASE_URL;

    expect(resolveTestDatabaseUrl("E2E")).toBe(
      "postgresql://postgres:postgres@localhost:5432/ymc_test?schema=public",
    );
  });

  it("リモートホストを明示指定したら接続前に失敗する", () => {
    process.env.TEST_DATABASE_URL = "postgresql://u:p@db.pooler.example.com:5432/postgres";
    expect(() => resolveTestDatabaseUrl("E2E")).toThrow(/ローカルの DB にしか接続できません/);
  });

  it("失敗メッセージに接続先ホストと復旧手順を含める", () => {
    process.env.TEST_DATABASE_URL = "postgresql://u:p@db.example.com:5432/postgres";
    expect(() => resolveTestDatabaseUrl("IT")).toThrow(/db\.example\.com/);
    expect(() => resolveTestDatabaseUrl("IT")).toThrow(/docker compose/);
  });
});
