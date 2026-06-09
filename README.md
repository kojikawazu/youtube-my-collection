# YouTube My Collection

[![CI](https://github.com/kojikawazu/youtube-my-collection/actions/workflows/ci.yml/badge.svg)](https://github.com/kojikawazu/youtube-my-collection/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

YouTube で良かった動画を後から見返せる**公開コレクション**。一般公開のリスト/詳細閲覧と、管理者（単一ユーザー）による追加・編集・削除を提供する。

**Tech:** Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS / Supabase (Auth + Postgres) / Prisma ・ Deploy: Vercel

## 主な機能

- 🎬 **サムネ中心のカード一覧** — 動画をサムネイル・タイトル・タグ・カテゴリ・5 段階評価で一覧表示
- 🔍 **検索** — タイトル部分一致 + タグ一致のキーワード検索
- ↕️ **並び替え** — 追加日（新しい順）/ 評価（高い順）/ 公開日（将来拡張）
- 📄 **ページング** — 10 件/ページ、最大 5 ページボタン、検索・並び替え時は 1 ページ目へリセット
- 📝 **Markdown メモ** — 「良かったポイント」「メモ」を Markdown で記録（生 HTML 無効・画像埋め込み可）
- 🔐 **管理者 CRUD** — Google OAuth + allowlist で認証した単一管理者のみ追加/編集/削除可能（閲覧は誰でも）

詳細仕様は [ドキュメント](#ドキュメント)を参照。

## クイックスタート

> ⚠️ このアプリは Supabase（DB + 認証）への接続が前提です。`pnpm dev` だけでは動きません。環境変数の設定が必須です。

```bash
cd front
cp .env.example .env.local   # 値を記入（取得手順は下記セットアップ参照）
corepack enable              # pnpm@10.7.0 を有効化
pnpm install
pnpm exec prisma generate
pnpm dev                     # http://localhost:3000
```

**ゼロからの完全なセットアップ手順**（Supabase プロジェクト作成・Google OAuth 設定・env 取得）は [`docs/09-architecture-specification.md`](docs/09-architecture-specification.md#ローカル開発セットアップゼロから動かす) を参照。

### よく使うコマンド（`front/` 配下）

| コマンド | 用途 |
|---|---|
| `pnpm dev` | 開発サーバー |
| `pnpm build` / `pnpm start` | 本番ビルド / 起動 |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:e2e` | ユニット（Vitest）/ E2E（Playwright） |

## ドキュメント

仕様書・補足資料・テスト設計の一覧は [docs/README.md](docs/README.md) を参照。

- 標準仕様書（01〜11）: [docs/README.md](docs/README.md#標準仕様書)
- 補足・運用・履歴系の資料: [docs/README.md](docs/README.md#notes--運用履歴参考資料)
- テスト設計の詳細: [docs/README.md](docs/README.md#test-design--テスト設計)

## プロジェクト構成

```
front/   Next.js (App Router) + TypeScript + Tailwind のフロント実装
docs/    要件・仕様・設計ドキュメント（上記）
tasks/   個別タスクの作業メモ
base/    デザイン参照用の元 UI（read-only スナップショット）
```

### front/ の主要ファイル

front/src の詳細なディレクトリ構成（最終形）は [docs/notes/atomic-design-plan.md](docs/notes/atomic-design-plan.md#ディレクトリ構成最終形) を参照。

## 開発

- **ブランチ運用**: `main` への直接コミット禁止。`feature/*` `fix/*` `chore/*` 等で作業し PR でマージ（GitHub Flow）。
- **テスト必須**: 実装時はテストコードも書く。方針は [`docs/08-test-specification.md`](docs/08-test-specification.md)。
- **ドキュメント同期**: コード変更時は影響するドキュメントを同一 PR で更新する。
- 詳細な開発ルールは [`CLAUDE.md`](CLAUDE.md) と [`.claude/rules/`](.claude/rules/) を参照。

## ライセンス

[MIT License](LICENSE)
