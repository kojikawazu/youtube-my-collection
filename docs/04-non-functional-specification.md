# 非機能仕様書

パフォーマンス・可用性・運用に関する要件を定義する。実装の詳細は [`notes/list-loading-optimization.md`](./notes/list-loading-optimization.md) を参照。

## 目次

- [パフォーマンス要件](#パフォーマンス要件)
  - [実施済みの最適化（Step A）](#実施済みの最適化step-a)
- [可用性・信頼性](#可用性信頼性)
- [エラーハンドリング・堅牢性](#エラーハンドリング堅牢性)
- [ユーザビリティ要件](#ユーザビリティ要件)
  - [アクセシビリティ要件](#アクセシビリティ要件)
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

### アクセシビリティ要件

マウス以外の入力手段・支援技術（スクリーンリーダー）で、一覧・詳細・追加・編集・削除の全操作を完結できることを要件とする。

| 観点 | 方針 | 実装箇所 |
|---|---|---|
| **キーボード操作** | 操作要素は native `button` / `a` にする。`div` に `onClick` を付けない | カードのタイトル（`VideoCard`）、ヘッダーロゴ（`Header`） |
| **ダイアログ** | `role="dialog"` / `aria-modal` / タイトル・本文の関連付け、開いたら内部へフォーカス移動、Tab をダイアログ内で循環、Escape で閉じる、閉じたら元の要素へフォーカス復帰 | `Modal` |
| **アクセシブル名** | アイコンのみの操作要素には `aria-label` を付ける。装飾アイコンは `aria-hidden` | 追加 FAB、削除、ログイン/ログアウト、検索、並び替え |
| **フォーム** | `label` を `htmlFor` / `id` で関連付ける。エラーは `aria-invalid` ＋ `aria-describedby` で入力欄に紐付け、`role="alert"` で即時通知する | `VideoForm` |
| **通知** | トーストは常設の live region（`role="status"` / `aria-live="polite"`）に描画する。領域を後から挿入すると読み上げられないため | `Toast` |
| **現在位置** | 現在ページのページャボタンに `aria-current="page"` を付ける | `Pagination` |

- カード全体を `button` にすると内部の削除ボタンが入れ子インタラクティブ要素になるため、タイトルのみを `button` とし、疑似要素でカード全面へ当たり判定を広げる（stretched link）。
- 回帰は Testing Library（ロール・アクセシブル名・フォーカス）と Playwright（キーボードのみでの詳細遷移）で担保する。

## 対応環境

- モダンブラウザ（Chromium / Firefox / WebKit）を想定。E2E は Playwright の各エンジンで検証可能

## 将来課題（Step B）

- Prisma `select` で一覧取得から `goodPoints` / `memo` を除外
- 一覧の並び順は一意化のため複合キー（例: `rating` → `createdAt` → `id`）になっている（[`07-api-specification.md`](./07-api-specification.md)）。現在の単一列インデックスでは後半のキーがインデックスで解決されないため、**件数が増えてソートが遅くなった場合は複合インデックスの追加を検討する**
- 詳細遷移時に `GET /api/videos/:id` を個別 fetch（データフロー変更が必要）

> タスク管理は [`11-tasks.md`](./11-tasks.md) を参照。
