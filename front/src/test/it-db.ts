// IT の接続先。docker-compose.test.yml の Postgres を既定にし、CI 等では環境変数で上書きできる。
// 唯一の真実にして globalSetup・vitest 設定・テストの三者で同じ URL を使う。
export const IT_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ymc_test?schema=public";
