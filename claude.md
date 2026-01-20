# 再開メモ

## 目的
YouTubeで良かった動画を後から見返せる公開コレクションを作る。

## 直近の状態
- UIは `base/` の見た目を再現し、`front/` に実装済み
- 画面: リスト/詳細/ログイン/追加/編集
- データ: Supabase + PrismaのAPI土台実装済み（認証は未実装）
- 文言: 日本語化済み

## 重要な決定事項
- 技術: Next.js(App Router) + TypeScript + Tailwind
- 認証: Supabase Auth（Google OAuth2 + 許可メール1件）※まだ未実装
- DB: Supabase Postgres + Prisma（未実装）
- 本番: Cloud Run
- デザイン: 薄赤テーマ、`base` UIを完全再現

## 次にやること候補
- UI入力バリデーション強化
- サムネ/タイトル自動取得の正式化
- 認証（Supabase Auth + allowlist）

## 主要参照
- `docs/01-requirements.md`
- `docs/05-tech-stack.md`
- `docs/06-api.md`
- `docs/07-prisma-schema.md`
- `docs/10-design.md`
