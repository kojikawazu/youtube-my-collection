# 要求仕様書

プロジェクトの背景・目標・スコープ・制約を定義する。機能の詳細要件は [`02-requirements-specification.md`](./02-requirements-specification.md) を参照。

## 背景・目的

良かった YouTube 動画を後から見返せる**公開コレクション**を作る。視聴して良かった動画を、タイトル・タグ・カテゴリ・評価・メモ付きで蓄積し、誰でも閲覧できる形で公開する。

## ステークホルダー

| 役割 | 説明 |
|------|------|
| 管理者（単一ユーザー） | コレクションの作成・編集・削除を行う唯一の運用者。Google OAuth + allowlist で認可 |
| 一般閲覧者 | 認証不要で一覧・詳細を閲覧する（書き込み不可） |

## スコープ

- 一般公開のリスト / 詳細ページ
- 管理者（単一ユーザー）による作成 / 編集 / 削除
- 管理者向けのログイン / 追加 / 編集画面
- 一覧のページング機能（件数増加時の閲覧性維持）

### スコープ外（将来拡張）

- 公開日による並び替え・絞り込み（フィールドは保持するが現状未使用）
- 管理者の複数化・RBAC
- YouTube Data API 連携（タイトル等の自動取得）

## 制約・前提

- 技術スタックは Next.js / TypeScript + Supabase Auth + Prisma（詳細は [`09-architecture-specification.md`](./09-architecture-specification.md)）
- 本番デプロイは Vercel（`main` ブランチ、`front/` のみ）
- フロント実装は `front/` フォルダ配下
- データは Supabase Postgres を前提に実装（インメモリは廃止）

## 主要な決定事項

- タイトルはユーザー入力、サムネは YouTube URL からクライアント側で自動生成
- 公開範囲は完全公開（リスト / 詳細は認証不要）
- 公開日は将来拡張として保留
- 管理者操作は認証 + allowlist + API 層チェックで保護（詳細は [`06-security-specification.md`](./06-security-specification.md)）
