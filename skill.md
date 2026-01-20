# 現在のスキル/前提

## 実装方針
- フロントは `front/` に新規実装
- UIは `base/` のデザイン/構成を再現
- 初期データはインメモリで保持（後でSupabaseへ移行）
- 変更はブランチを切り、PRで統合する
- プッシュ前に必ず確認を取り、他にやるべきことがないか相談する

## 実装済み
- 画面: リスト/詳細/ログイン/追加/編集
- 管理操作: 追加/編集/削除（インメモリ）
- デザイン: 薄赤テーマ、視認性重視

## 未実装
- Supabase Auth（Google OAuth2 + allowlist）
- Supabase DB + Prisma
- API Route Handlers

## 重要ファイル
- `front/src/app/page.tsx`
- `front/src/components/Modal.tsx`
- `front/src/components/MarkdownRenderer.tsx`
- `front/src/components/Rating.tsx`
- `front/src/lib/types.ts`
- `front/src/lib/sample-videos.ts`
