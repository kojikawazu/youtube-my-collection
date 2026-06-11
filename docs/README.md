# ドキュメント索引

YouTube My Collection の仕様・設計ドキュメント一覧。プロジェクト概要はリポジトリ直下の [`../README.md`](../README.md) を参照。

ドキュメントは 3 層で構成している。

- **標準仕様書（`01`〜`11`）** — 仕様の正準。番号順に読むと全体像をつかめる。
- **[`notes/`](./notes/)** — 運用・履歴・参考資料（設計計画・バグレポート・ライブラリガイド 等）。
- **[`test-design/`](./test-design/)** — テスト設計の詳細ケース表。

## 読み進め順（おすすめ）

`01 要求 → 02 要件 → 03 機能 → 05 データ → 06 セキュリティ → 07 API → 08 テスト → 09 アーキテクチャ`。
04・10・11 は随時参照。初めて環境構築する場合は [`09-architecture-specification.md`](./09-architecture-specification.md#ローカル開発セットアップゼロから動かす) のセットアップ手順から。

## 標準仕様書

| # | ドキュメント | 概要 |
|---|---|---|
| 01 | [要求仕様書](./01-business-requirements.md) | 背景・目的・スコープ・ステークホルダー・制約・決定事項 |
| 02 | [要件仕様書](./02-requirements-specification.md) | 機能要件・データ項目・カテゴリ・受け入れ条件 |
| 03 | [機能仕様書](./03-functional-specification.md) | 画面仕様・画面遷移・UI/UX 方針 |
| 04 | [非機能仕様書](./04-non-functional-specification.md) | パフォーマンス・可用性・エラーハンドリング・対応環境 |
| 05 | [データ仕様書](./05-data-specification.md) | データモデル・Prisma スキーマ・インデックス |
| 06 | [セキュリティ仕様書](./06-security-specification.md) | 認証・認可・入力バリデーション・RLS |
| 07 | [API 仕様書](./07-api-specification.md) | エンドポイント・リクエスト/レスポンス・認証・ステータスコード |
| 08 | [テスト仕様書](./08-test-specification.md) | テスト戦略・E2E/ユニットケース・CI |
| 09 | [アーキテクチャ仕様書](./09-architecture-specification.md) | 技術スタック・構成・環境変数・**ローカルセットアップ手順** |
| 10 | [その他仕様書](./10-miscellaneous-specification.md) | 用語集・コーディング規約・参照索引 |
| 11 | [タスク](./11-tasks.md) | 完了済み実績・将来課題 |

## notes/ — 運用・履歴・参考資料

| ドキュメント | 概要 |
|---|---|
| [atomic-design-plan](./notes/atomic-design-plan.md) | Atomic Design 段階的導入計画（コンポーネント分割） |
| [list-loading-optimization](./notes/list-loading-optimization.md) | リスト画面ローディング高速化の実施詳細 |
| [go-echo-backend-plan](./notes/go-echo-backend-plan.md) | Go + Echo 共通バックエンドへの API 移行計画 |
| [openapi-zod-plan](./notes/openapi-zod-plan.md) | Zod を単一ソースにした OpenAPI/Swagger UI 導入計画（A1: 完全置換） |
| [oauth-sequence](./notes/oauth-sequence.md) | OAuth 認証のシーケンス図 |
| [auth-troubleshooting](./notes/auth-troubleshooting.md) | 認証トラブルシューティング |
| [admin-email-exposure-mitigation](./notes/admin-email-exposure-mitigation.md) | 管理者メール露出対策の実施経緯 |
| [gemini-ui-prompt](./notes/gemini-ui-prompt.md) | UI 生成に使った Gemini プロンプト |
| [bug-reports/](./notes/bug-reports/) | 過去のバグレポート（[403](./notes/bug-reports/01-api-videos-403.md) / [401](./notes/bug-reports/02-api-auth-admin-401.md)） |
| [library-guides/](./notes/library-guides/) | ライブラリ利用ガイド（下表） |

### library-guides/

| ガイド | 対象 |
|---|---|
| [framer-motion](./notes/library-guides/framer-motion.md) | 画面遷移・モーダルのアニメーション |
| [lucide-react](./notes/library-guides/lucide-react.md) | アイコン |
| [react-markdown-remark-gfm](./notes/library-guides/react-markdown-remark-gfm.md) | Markdown 表示（生 HTML 無効） |
| [youtube-thumbnail](./notes/library-guides/youtube-thumbnail.md) | YouTube URL からサムネ URL を生成 |

## test-design/ — テスト設計

| ドキュメント | 対象 |
|---|---|
| [01-unit-validation](./test-design/01-unit-validation.md) | `validateVideoInput`（バリデーション純粋関数） |
| [02-unit-hooks](./test-design/02-unit-hooks.md) | カスタムフック（useAuth / useVideos / useVideoForm 他） |
| [03-unit-modal](./test-design/03-unit-modal.md) | Modal コンポーネント |
| [04-e2e-admin](./test-design/04-e2e-admin.md) | 管理者フロー E2E（API モック方式） |

## 関連

- 開発ルール: [`../CLAUDE.md`](../CLAUDE.md) と [`../.claude/rules/`](../.claude/rules/)
- ドキュメント更新の影響マップ: [`../.claude/rules/documentation.md`](../.claude/rules/documentation.md)
