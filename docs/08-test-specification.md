# テスト仕様書

テスト戦略・テストケース・ツールを定義する。詳細なテスト設計（ユニット/E2E のケース表）は [`test-design/`](./test-design/) を参照。

## 目次

- [テスト戦略](#テスト戦略)
- [実行方法](#実行方法)
- [E2E ケース（公開フロー / Playwright）](#e2e-ケース公開フロー--playwright)
- [管理者フロー E2E（admin.spec.ts）](#管理者フロー-e2eadminspects)
- [ユニットテスト設計](#ユニットテスト設計)
- [CI（GitHub Actions）](#cigithub-actions)
- [原則](#原則)

## テスト戦略

| レイヤー | ツール | 対象 |
|----------|--------|------|
| ユニット | Vitest + @testing-library/react | `lib/validation.ts`、各フック、`Modal.tsx` |
| E2E | Playwright | 公開フロー（`public.spec.ts`）、管理者フロー（`admin.spec.ts`） |

- 公開ユーザーの閲覧体験を優先的に自動化
- 管理者操作(追加/編集/削除)は `admin.spec.ts` で E2E カバー済み（N-1〜S-5, A-1）。手動必須は実 Google OAuth ログイン（#1）のみ
- `/api/videos` は E2E 内でモックし、DB 依存を排除
- モックは外部 I/O（HTTP・SDK）のみ。ビジネスロジックはモックしない

## 実行方法

```bash
cd front
pnpm test          # ユニット（Vitest）
pnpm test:e2e      # E2E（Playwright）
```

※ E2E 初回はブラウザをインストールするため `pnpm exec playwright install` を実行。

## E2E ケース（公開フロー / Playwright）

| # | ケース | 分類 |
|---|--------|------|
| 1 | リスト表示（「コレクション」見出し + カード表示） | 正常系 |
| 2 | 詳細遷移（タイトル + 「YouTube を開く」リンク + 戻り） | 正常系 |
| 3 | 検索（キーワードで該当カードのみ表示） | 正常系 |
| 4 | 並び替え（高評価順で評価の高い動画が先頭） | 正常系 |
| 5 | ログイン導線（ヘッダーアイコン → ログイン画面） | 正常系 |
| 6 | 空リスト（空配列でも画面が崩れない） | 準正常系 |
| 7 | 公開日未設定（publishDate=null で「公開日未設定」表示） | 準正常系 |
| 8 | API 失敗（500 → 「データの取得に失敗しました。」） | 異常系 |
| 9 | API タイムアウト（同上メッセージ） | 異常系 |
| 10 | 未ログイン時の認証リクエスト抑制（/api/auth/admin を呼ばない） | 回帰 |
| 11 | ページネーション（10 件/ページ、「次へ」で `2 / 2`） | 正常系 |
| 12 | ページ番号ボタン最大 5 件（61 件で `3 4 5 6 7` ウィンドウ） | 正常系 |
| 13 | 並び替え変更時の 1 ページ目リセット | 準正常系 |

> 備考: 仕様上は 13 ケースだが、Playwright 実装ではケース 11 の「次へ」検証をケース 11 内に含めているため、`public.spec.ts` の `test()` は 12 件。

## 管理者フロー E2E（`admin.spec.ts`）

API モック + セッション注入方式で実 OAuth なしに管理者 CRUD を検証（N-1〜N-6 / S-1〜S-5 / A-1、計 13 `test()`）。詳細ケースは [`test-design/04-e2e-admin.md`](./test-design/04-e2e-admin.md) を参照。

## ユニットテスト設計

- バリデーション純粋関数: [`test-design/01-unit-validation.md`](./test-design/01-unit-validation.md)
- カスタムフック: [`test-design/02-unit-hooks.md`](./test-design/02-unit-hooks.md)
- Modal コンポーネント: [`test-design/03-unit-modal.md`](./test-design/03-unit-modal.md)

## CI（GitHub Actions）

`.github/workflows/ci.yml` が、`main` / `feature/**` / `chore/**` への push と PR（`front/**` 変更時）で以下を実行する。

1. `pnpm install --frozen-lockfile`（Node 20 / pnpm 10.7.0）
2. `pnpm run lint`
3. `pnpm run test`（ユニット）
4. `pnpm exec playwright install --with-deps` → `pnpm run test:e2e`（E2E）

E2E は Supabase へ実接続せず、`NEXT_PUBLIC_SUPABASE_URL` 等にダミー値を渡し、API はルートモックで動作する。ステータスは README の CI バッジで確認できる。

## 原則

- テストは仕様の証明。テストが失敗したら実装を修正する（テストを実装に合わせない）
- 正常系 1 : 異常系（準正常系 + 異常系）2 以上の比率を目安とする
- `toBeTruthy()` 等の曖昧なアサーションを避け、具体的な値で検証する
