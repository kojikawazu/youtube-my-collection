# テスト設計: 管理者フロー E2E テスト（API モック方式）

## 対象

- 対象機能: 管理者 CRUD フロー（追加・編集・削除）、認証フロー（非管理者拒否・ログアウト）
- 対象ファイル: `front/src/app/page.tsx` および全 organisms/hooks
- スタック: Next.js / Playwright
- テストファイル（予定）: `front/tests/e2e/admin.spec.ts`

## ポリシー変更の背景

`docs/04.e2e-cases.md` には「管理者操作はOAuthが必要なため現状はE2E対象外」と記載されている。
本設計はこのポリシーを **変更** する。`page.route` による API モックと `addInitScript` によるセッション注入を組み合わせることで、実 OAuth なしに管理者フローをブラウザレベルで検証できるようになったため、管理者フローを E2E の対象に追加する。

**`docs/04.e2e-cases.md` の「管理者操作はE2E対象外」という記述は、本設計の実装完了後に更新が必要。**

---

## 前提

- Supabase Auth の実 Google OAuth は Playwright でモック不可
- `page.addInitScript` で `localStorage` に Supabase セッション相当の値を注入する
- `/api/auth/admin` を `page.route` でモックして `{ isAdmin: true/false }` を制御する
- `/api/videos` (GET/POST/PATCH/DELETE) も `page.route` でモックする
- ブラウザの `fetch` が `localStorage` のトークンを `Authorization: Bearer` に乗せる実際の動作を確認する

### セッション注入ヘルパー（実装時の方針）

```ts
// Supabase JS は localStorage の `sb-<ref>-auth-token` キーを参照する
// テスト用の fake session を注入することで「ログイン済み状態」を再現する
await page.addInitScript(() => {
  const fakeSession = { access_token: "test-token", ... };
  localStorage.setItem("sb-<ref>-auth-token", JSON.stringify({ ...fakeSession }));
});
```

> 実際のキー名は `front/src/lib/supabase/client.ts` の supabaseUrl から導出する。
> セッション注入が難しい場合は `useAuth` の内部 fetch のみモックして代替する。

---

## テストケース一覧

### 正常系

| # | テストケース | セットアップ | 操作 | 期待結果 | 優先度 |
|---|---|---|---|---|---|
| N-1 | 管理者状態 → 管理者バッジ + FAB 表示 | admin session 注入 + `/api/auth/admin` → `{isAdmin:true}` | ページ表示 | 「管理者」バッジが表示、追加 FAB が表示される | High |
| N-2 | 動画追加 → トースト "追加しました。" | admin session 注入, POST mock 201 | FAB クリック → フォーム入力 → 保存モーダル確定 | `"追加しました。"` トーストが右上に表示される | High |
| N-3 | 動画編集 → トースト "更新しました。" + 詳細に反映 | admin session 注入, PATCH mock 200 (更新後データ) | 詳細 → 編集 → 変更 → 保存モーダル確定 | `"更新しました。"` トースト、詳細に新タイトルが反映される | High |
| N-4 | 動画削除（カード） → トースト "削除しました。" | admin session 注入, DELETE mock 204 | カードの削除ボタン → 削除モーダル確定 | `"削除しました。"` トースト、リストから消える | High |
| N-5 | 動画削除（詳細画面） → リスト画面に戻る | admin session 注入, DELETE mock 204 | 詳細 → 削除ボタン → 削除モーダル確定 | 「コレクション」見出しが表示される（リストに戻る） | High |
| N-6 | 管理者ログアウト → バッジ/FAB 消える + リスト画面 | admin session 注入後 | ログアウトボタンクリック | バッジ・FAB が非表示、「コレクション」見出し表示 | High |

### 準正常系

| # | テストケース | セットアップ | 操作 | 期待結果 | 優先度 |
|---|---|---|---|---|---|
| S-1 | 非管理者ログイン → トースト + ログアウト状態 | session 注入 + `/api/auth/admin` → `{isAdmin:false}` | ページ表示 | `"このアカウントは権限がありません。"` トースト、管理者バッジなし | High |
| S-2 | バリデーションエラー（タイトル空・URL空） → エラー表示・保存されない | admin session 注入 | FAB クリック → 空のままフォーム保存 | エラーメッセージ表示、POST が呼ばれない | High |
| S-3a | 追加 API 失敗 → モーダルが閉じない・再操作可能 | admin session 注入, POST mock 500 | FAB → フォーム入力 → 保存モーダル確定 | `alert("保存に失敗しました。")` ダイアログが表示される（`page.on('dialog', d => d.accept())` で受け入れ）、モーダルが開いたまま、確認ボタンが再び有効になる | High |
| S-3b | 編集 API 失敗 → モーダルが閉じない・再操作可能 | admin session 注入, PATCH mock 500 | 詳細 → 編集 → 変更 → 保存モーダル確定 | `alert("更新に失敗しました。...")` ダイアログが表示される（同上）、モーダルが開いたまま、確認ボタンが再び有効になる | High |
| S-4 | 削除 API 失敗 → モーダルが閉じない・再操作可能 | admin session 注入, DELETE mock 500 | カード削除ボタン → 削除モーダル確定 | `alert()` ダイアログが表示される（同上）、モーダルが開いたまま、確認ボタンが再び有効になる | High |
| S-5 | 確定ボタン連打 → 二重送信されない | admin session 注入, POST mock (遅延 500ms) | 保存モーダルで確定を素早く 2 回クリック | POST リクエストが 1 回のみ発生する | High |

### 異常系

| # | テストケース | セットアップ | 操作 | 期待結果 | 優先度 |
|---|---|---|---|---|---|
| A-1 | モーダル閉じた後 body スクロール復元 | admin session 注入 | モーダル open → キャンセルクリック | `document.body.style.overflow` が `"hidden"` でない | Medium |

---

## テスト構成

### E2E テスト（Playwright）
- シナリオ: 管理者 CRUD フロー、認証フロー
- 前提条件:
  - `/api/auth/admin` をルートモックで制御
  - `/api/videos` (GET/POST/PATCH/DELETE) をルートモックで制御
  - Supabase セッション相当の状態を注入（`addInitScript` または `useAuth` fetch モック）
- テストファイル: `front/tests/e2e/admin.spec.ts`

## モック方針

```ts
// GET /api/videos → baseVideos 返却（public.spec.ts の mockVideosApi を共通ヘルパー化して再利用）
// GET /api/auth/admin → { isAdmin: true } または { isAdmin: false }
// POST /api/videos → 201 + 作成済みデータ
// PATCH /api/videos/:id → 200 + 更新済みデータ
// DELETE /api/videos/:id → 204
```

- モックは `beforeEach` に集約し、テストごとに上書きする方式
- `public.spec.ts` の `buildApiResponse` / `mockVideosApi` を `tests/e2e/helpers.ts` に切り出して共有する

---

## 実装完了後に更新が必要な既存ドキュメント

| ドキュメント | 箇所 | 更新内容 |
|---|---|---|
| `docs/04.e2e-cases.md:17-19` | テスト方針「管理者操作はE2E対象外」 | 「`admin.spec.ts` で管理者フロー #N-1〜S-5, A-1 を E2E カバー済み。手動必須は #1（実 Google OAuth ログイン）のみ」に更新 |
| `docs/16-atomic-design-plan.md:163-177` | 管理者フロー手動確認チェックリスト | 各項目に「自動化済み（`admin.spec.ts`）」または「手動必須」のラベルを追記 |

---

## 既存 E2E テスト（public.spec.ts）のメンテナンス項目

| # | 問題 | 該当箇所 | 修正方針 |
|---|---|---|---|
| M-1 | `page.waitForTimeout(1000)` → 時間依存で不安定 | `public.spec.ts:372` | `await expect(page.getByRole("heading", ...)).toBeVisible()` 後に assertion で代替。または `page.waitForResponse` で置換 |
| M-2 | `buildApiResponse` がテスト 10 で重複実装 | `public.spec.ts:344-357` | `mockVideosApi` ヘルパーに統一（test 10 も `mockVideosApi(page, baseVideos)` を使う） |
| M-3 | `baseVideos` / `buildApiResponse` / `mockVideosApi` が admin.spec.ts でも必要 | — | `tests/e2e/helpers.ts` に切り出してインポートで共有 |
