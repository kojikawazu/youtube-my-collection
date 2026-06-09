# YouTube My Collection

[![CI](https://github.com/kojikawazu/youtube-my-collection/actions/workflows/ci.yml/badge.svg)](https://github.com/kojikawazu/youtube-my-collection/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

YouTube で良かった動画を後から見返せる**公開コレクション**。一般公開のリスト/詳細閲覧と、管理者（単一ユーザー）による追加・編集・削除を提供する。

**Tech:** Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS / Supabase (Auth + Postgres) / Prisma ・ Deploy: Vercel

## デモ / スクリーンショット

> 🚧 デモ URL とスクリーンショットは未掲載。本番（Vercel）にデプロイ済みのため、URL と一覧/詳細のキャプチャを追加予定。
>
> 記入手順: 本番 URL をこの節に記載し、画像は `docs/assets/` に配置して Markdown 画像記法で貼る。

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

仕様は `docs/` 配下に標準仕様書として整理している。番号順に読むと全体像を把握できる。

| # | ドキュメント | 内容 |
|---|---|---|
| 01 | [要求仕様書](docs/01-business-requirements.md) | 背景・目的・スコープ・制約・決定事項 |
| 02 | [要件仕様書](docs/02-requirements-specification.md) | 機能要件・データ項目・受け入れ条件 |
| 03 | [機能仕様書](docs/03-functional-specification.md) | 画面仕様・遷移・UI/UX 方針 |
| 04 | [非機能仕様書](docs/04-non-functional-specification.md) | パフォーマンス・可用性・エラー方針 |
| 05 | [データ仕様書](docs/05-data-specification.md) | データモデル・Prisma スキーマ |
| 06 | [セキュリティ仕様書](docs/06-security-specification.md) | 認証・認可・バリデーション・RLS |
| 07 | [API 仕様書](docs/07-api-specification.md) | エンドポイント・リクエスト/レスポンス |
| 08 | [テスト仕様書](docs/08-test-specification.md) | テスト戦略・E2E/ユニットケース |
| 09 | [アーキテクチャ仕様書](docs/09-architecture-specification.md) | 技術スタック・構成・環境変数・**セットアップ手順** |
| 10 | [その他仕様書](docs/10-miscellaneous-specification.md) | 用語集・参照索引 |
| 11 | [タスク](docs/11-tasks.md) | 実績・将来課題 |

- 補足・運用・履歴系の資料: [`docs/notes/`](docs/notes/)（ライブラリガイド・バグレポート・設計計画・OAuth シーケンス 等）
- テスト設計の詳細: [`docs/test-design/`](docs/test-design/)

## プロジェクト構成

```
front/   Next.js (App Router) + TypeScript + Tailwind のフロント実装
docs/    要件・仕様・設計ドキュメント（上記）
tasks/   個別タスクの作業メモ
base/    デザイン参照用の元 UI（read-only スナップショット）
```

### front/ の主要ファイル

| パス | 役割 |
|------|------|
| `src/app/page.tsx` | 画面切替コーディネーター |
| `src/components/{atoms,molecules,organisms}/` | UI 部品（Atomic Design） |
| `src/hooks/` | 認証・一覧取得・フォーム等のロジック |
| `src/app/api/videos/*`, `src/app/api/auth/admin/*` | Route Handlers（API） |
| `src/lib/` | 型定義・バリデーション・Supabase/Prisma クライアント |

## 開発

- **ブランチ運用**: `main` への直接コミット禁止。`feature/*` `fix/*` `chore/*` 等で作業し PR でマージ（GitHub Flow）。
- **テスト必須**: 実装時はテストコードも書く。方針は [`docs/08-test-specification.md`](docs/08-test-specification.md)。
- **ドキュメント同期**: コード変更時は影響するドキュメントを同一 PR で更新する。
- 詳細な開発ルールは [`CLAUDE.md`](CLAUDE.md) と [`.claude/rules/`](.claude/rules/) を参照。

## ライセンス

[MIT License](LICENSE)
