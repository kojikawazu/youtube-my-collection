# 非機能仕様書

パフォーマンス・可用性・運用に関する要件を定義する。実装の詳細は [`notes/list-loading-optimization.md`](./notes/list-loading-optimization.md) を参照。

## 目次

- [パフォーマンス要件](#パフォーマンス要件)
  - [実施済みの最適化（Step A）](#実施済みの最適化step-a)
- [可用性・信頼性](#可用性信頼性)
- [エラーハンドリング・堅牢性](#エラーハンドリング堅牢性)
- [ユーザビリティ要件](#ユーザビリティ要件)
- [対応環境](#対応環境)
- [将来課題（Step B）](#将来課題step-b)

## パフォーマンス要件

- リスト画面の初回表示・ページ遷移を体感的に高速に保つ
- 投稿数の増加に対して閲覧性・応答性を維持する

### 実施済みの最適化（Step A）

| 施策 | 内容 |
|------|------|
| CDN キャッシュ | `GET /api/videos` に `Cache-Control: public, s-maxage=30, stale-while-revalidate=59` を付与。POST/PATCH/DELETE には付けない |
| キャッシュバスティング | CRUD 後の再取得は `_t=<timestamp>` クエリで CDN を迂回し最新データを取得 |
| スケルトン UI | 初回ロードはスケルトンカード 10 枚、ページ遷移時は既存カードを半透明 + 操作抑止 |
| Cron ウォームアップ | Vercel Cron（5 分間隔）で `/api/videos` を直接叩き、サーバレス関数のコールドスタートを抑制 |

詳細・経緯・効果の限界は [`notes/list-loading-optimization.md`](./notes/list-loading-optimization.md) を参照。

## 可用性・信頼性

- Vercel のウォーム状態維持は最適化であり保証ではない（デプロイ後に実測で確認）
- API 失敗・タイムアウト時はユーザーにエラーバナーを表示（[`08-test-specification.md`](./08-test-specification.md) のケース 8/9）

## エラーハンドリング・堅牢性

| 状況 | 振る舞い |
|------|----------|
| 一覧取得の失敗/タイムアウト | 「データの取得に失敗しました。」のエラーバナーを表示し、画面は崩さない |
| 保存/削除 API の失敗 | 確認モーダルを閉じず、アラートを表示して再操作可能にする |
| 確定ボタンの連打 | 処理中はボタンを `disabled` にして二重送信を防止 |
| 空リスト | ページング UI を出さず、空状態として描画 |
| `publishDate` が null | 詳細で「公開日未設定」を表示 |

## ユーザビリティ要件

- **レスポンシブ**: モバイル / デスクトップ両対応（[`03-functional-specification.md`](./03-functional-specification.md) の UI/UX 方針）
- **視認性**: 薄赤のライトテーマ、十分な余白とコントラスト
- **フィードバック**: CRUD 成功時に右上トースト、バリデーションエラーは入力欄で強調

## 対応環境

- モダンブラウザ（Chromium / Firefox / WebKit）を想定。E2E は Playwright の各エンジンで検証可能

## 将来課題（Step B）

- Prisma `select` で一覧取得から `goodPoints` / `memo` を除外
- 詳細遷移時に `GET /api/videos/:id` を個別 fetch（データフロー変更が必要）

> タスク管理は [`11-tasks.md`](./11-tasks.md) を参照。
