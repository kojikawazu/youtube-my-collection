# タスク07: ページング機能

## 目的
動画件数増加時でも、公開ユーザーが一覧を快適に閲覧できるようにする。

## 範囲
- 一覧ページのページングUI/挙動の実装
- APIクエリ `limit` / `offset` を利用したページ単位取得
- 検索/並び替えとページングの整合性確保
- 必要なドキュメント更新

## 要件
- 公開ユーザー向けの閲覧体験を崩さない
- 既存の空状態・エラー表示を維持する
- モバイル/デスクトップ双方で操作しやすいUIにする

## 既存実装との差分（明示）
- `front/src/app/page.tsx` の `filteredVideos`（クライアント側の全件フィルタ+ソート）を廃止する。
- 検索・並び替えはAPIクエリ（`q` / `sort` / `order`）に移管し、一覧は常にサーバー結果を描画する。
- `GET /api/videos` の `limit` 既定値は現行コード `50` だが、本タスクで `10` に統一する。

## 設計（合意案）

### 1) 取得方式
- 一覧データはサーバー取得を基本とし、`sort` / `q` / `limit` / `offset` を毎回APIへ渡す。
- クライアント内の全件ソート・全件検索は行わない（ページングとの不整合を避ける）。

### 2) API設計（`GET /api/videos`）
- 既存パラメータ: `sort`, `order`, `tag`, `category`, `limit`, `offset`
- 追加パラメータ: `q`（任意の検索文字列）
- `q` の適用条件:
  - `title`: 部分一致（大文字小文字を区別しない）
  - `tags`: 完全一致（`has`）
- バリデーション:
  - `limit`: 1-100（未指定時は 10）
  - `offset`: 0以上（未指定時は 0）
- レスポンス本文は後方互換のため `VideoItem[]` を維持し、以下ヘッダーを追加:
  - `x-total-count`: 条件一致の総件数
  - `x-limit`: 実際に適用した `limit`
  - `x-offset`: 実際に適用した `offset`
- 実装方針:
  - `findMany` と `count` は同一 `where` 条件で実行する。
  - 件数取得は一覧取得と並列実行し、レスポンス遅延を最小化する（`prisma.$transaction` など）。

### 3) UI状態設計（`front/src/app/page.tsx`）
- 追加状態:
  - `currentPage`（初期値 1）
  - `pageSize`（固定 10）
  - `totalCount`
- `currentPage` から `offset = (currentPage - 1) * pageSize` を算出してAPI呼び出し。
- `sortOption` または `searchQuery` が変わったら `currentPage = 1` に戻す。
- ページ総数は `totalPages = max(1, ceil(totalCount / pageSize))`。
- 検索入力は 300ms デバウンスして再取得（過剰リクエスト抑制）。
- ヘッダー未設定時は `totalCount = 取得件数` としてフォールバック。

### 4) ページングUI
- 一覧グリッド下に `前へ` / `次へ` ボタン、`n / totalPages`、ページ番号ボタンを配置。
- ページ番号ボタンは最大 5 件表示（現在ページ中心、端では先頭/末尾に寄せる）。
- 先頭ページでは `前へ` を無効化、最終ページでは `次へ` を無効化。
- `totalCount = 0` のときはページングUI全体を非表示にする（空状態表示のみ）。
- モバイルでは横並びを維持しつつ最小幅で収まるボタンサイズにする。

### 5) CRUD後の再取得
- 追加/編集/削除成功後はローカル配列直接更新ではなく、現在条件で再取得する。
- 追加成功時は `currentPage = 1` に戻して再取得する（新規追加動画を見つけやすくするため）。
- 編集成功時は `currentPage` を維持したまま再取得する。
- 削除後にページが空になった場合のみ `currentPage` を 1 つ戻して再取得する。

### 6) E2E設計
- 既存テストの `page.route("**/api/videos**")` は、クエリ付きURLにも一致させる。
- 必要に応じてレスポンスヘッダー `x-total-count` を返すモックを追加。
- 新規ケース:
  - 11件以上のデータで1ページ目から2ページ目へ遷移できること
  - 総ページ数が6以上のとき、ページ番号ボタンの表示件数が5件に収まること
  - 並び替え変更時にページが1ページ目へ戻ること

## 想定変更箇所
- `front/src/app/`（一覧ページ）
- `front/src/components/`（ページングUI部品を追加する場合）
- `front/src/app/api/videos/route.ts`（必要に応じてクエリ処理確認）
- `docs/02-screens.md`（リスト画面仕様）
- `docs/06-api.md`（クエリ利用方針）

## 手順（案）
- ページサイズと初期ページ仕様を決定
- APIに `q` / `limit` / `offset` を反映し、`findMany + count` 並列取得を実装
- ページングUIを実装（Prev/Next など）
- ページ番号ボタン（最大5件）と `totalCount=0` 時の非表示ルールを実装
- 検索/並び替え時のページリセット・再計算を実装
- 追加成功時の `1ページ目へ戻す` 挙動を実装
- 既存E2Eへの影響を確認し、必要ならケースを更新

## 受け入れ基準
- 一覧ページにページングが表示され、前後遷移できる
- 検索/並び替え後もページングが正しく機能する
- API失敗時・空配列時の既存表示が維持される
- `npm run lint` が通る

## 進捗
- 実装完了（`front/src/app/page.tsx`, `front/src/app/api/videos/route.ts`）
- 検証: `npm run lint` / `npm run build` は成功
- 補足: `npm run test:e2e -- tests/e2e/public.spec.ts` は実行環境の Next.js ルート解決問題（`tailwindcss` 解決失敗）で完走せず
- 追加対応: レビュー指摘の E2E 2点（タグ一致ロジックのAPI準拠化、並び替え時の1ページ目リセットケース追加）を反映

## 関連Issue
- https://github.com/kojikawazu/youtube-my-collection/issues/31

## メモ
- 既存の `tasks/04-pagination-and-hobby-category.md` から、ページング機能を単体タスクとして分離した。
- タグ部分一致検索は現行API制約上コストが高いため、まずはタグ完全一致で導入する（必要なら別Issue化）。
