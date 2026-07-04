// E2E の webServer / seed / migrate が共有するテスト DB 接続先。
// docker-compose.test.yml の Postgres を既定にし、CI 等では環境変数で上書きできる。
export const E2E_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ymc_test?schema=public";
