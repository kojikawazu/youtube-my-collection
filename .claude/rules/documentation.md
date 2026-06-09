---
description: ドキュメント更新・設計書管理ルール（影響マップ + opt-out の完了条件）
globs:
---

# ドキュメント

コード変更がドキュメント（CLAUDE.md / README.md / docs/）と乖離しないことを構造的に担保する。

## 完了条件（opt-out）

変更は、下記「影響マップ」の対応ドキュメントを**同一 PR 内で更新する**ことを完了条件とする。

- 更新不要と判断した場合は、**PR 説明にその理由を明記する**（省略＝未対応とみなす）。
- この乖離チェックは `/self-review` と `/pr-create` の確認対象に含まれる。

## 影響マップ（変更種別 → 更新必須ドキュメント）

「どのドキュメントだっけ？」を考えさせないための逆引き表。

| 変更種別 | 更新必須ドキュメント |
|---|---|
| API エンドポイント変更（`front/src/app/api/*` 等） | `docs/07-api-specification.md` |
| データモデル・テーブル変更 | `docs/05-data-specification.md` |
| Prisma スキーマ変更 | `docs/05-data-specification.md` |
| 環境変数の追加・変更 | `README.md`（起動手順）、`docs/09-architecture-specification.md` |
| 依存ライブラリ追加・削除 | `README.md`、`docs/09-architecture-specification.md` |
| 認証・セキュリティ仕様変更（OAuth / allowlist 等） | `docs/06-security-specification.md`、`docs/notes/oauth-sequence.md` |
| 構成・設定・技術スタック変更 | `docs/09-architecture-specification.md`、`CLAUDE.md`、`README.md` |
| 新機能・画面の追加・変更 | `README.md`、`docs/02-requirements-specification.md`、`docs/03-functional-specification.md` |
| デザイン・UI 方針変更 | `docs/03-functional-specification.md`、`docs/notes/atomic-design-plan.md` |
| 非機能（性能・可用性）変更 | `docs/04-non-functional-specification.md`、`docs/notes/list-loading-optimization.md` |
| Go + Echo バックエンド関連の変更 | `docs/notes/go-echo-backend-plan.md` |
| テスト方針・テストケース変更 | `docs/08-test-specification.md`、`docs/test-design/` |
| `.claude/rules/` の規約変更 | `CLAUDE.md`（ルールテーブル） |

該当する変更がない場合はスキップする。

## 補足

- **ドキュメント更新**: 作業が完了したら、ルートドキュメント（CLAUDE.md / README.md / docs/）の更新が必要かどうか確認し、必要であれば更新する。
- **設計書の管理**: タスクごとに設計書を新規作成しない。既存の仕様書ドキュメント（`docs/` 配下のすべてのファイル）に追記・更新する。
