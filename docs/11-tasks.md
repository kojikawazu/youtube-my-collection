# タスク・進捗

開発タスク・マイルストーン・進捗を管理する。

## 目次

- [完了済み（実績）](#完了済み実績)
- [将来課題](#将来課題)

## 完了済み（実績）

| タスク | 概要 | 参照 |
|--------|------|------|
| 基本機能実装 | リスト/詳細/ログイン/追加/編集、Prisma + Supabase、Google OAuth + allowlist | [`01`](./01-business-requirements.md)〜[`09`](./09-architecture-specification.md) |
| ページング機能 | 10 件/ページ、最大 5 ページボタン、検索/並び替え時の 1 ページ目リセット | [`02`](./02-requirements-specification.md) |
| 管理者メール露出対策 | `NEXT_PUBLIC_ADMIN_EMAIL` 廃止、サーバー判定へ一本化 | [`notes/admin-email-exposure-mitigation.md`](./notes/admin-email-exposure-mitigation.md) |
| Atomic Design 化 | page.tsx を ~250 行へ縮小、atoms/molecules/organisms/hooks へ分割 | [`notes/atomic-design-plan.md`](./notes/atomic-design-plan.md) |
| リスト高速化（Step A） | CDN キャッシュ + スケルトン + Cron ウォームアップ | [`04`](./04-non-functional-specification.md)・[`notes/list-loading-optimization.md`](./notes/list-loading-optimization.md) |
| テスト整備 | ユニット（Vitest）+ E2E（Playwright public 12 / admin 13） | [`08`](./08-test-specification.md) |

## 将来課題

| タスク | 概要 | 参照 |
|--------|------|------|
| リスト高速化 Step B | 一覧取得から `goodPoints`/`memo` を除外、詳細は個別 fetch | [`04`](./04-non-functional-specification.md) |
| Go + Echo 移行 | データ API・管理者判定 API を共通バックエンドへ集約 | [`notes/go-echo-backend-plan.md`](./notes/go-echo-backend-plan.md) |
| 公開日の活用 | `publishDate` による並び替え・絞り込みの有効化 | [`02`](./02-requirements-specification.md) |
