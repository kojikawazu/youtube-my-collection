# テスト設計: Modal コンポーネント ユニットテスト

## 対象

- 対象機能: 確認モーダル（二重送信防止 / body スクロールロック）
- 対象ファイル: `front/src/components/Modal.tsx`
- スタック: Next.js / TypeScript / Vitest + @testing-library/react
- テストファイル（予定）: `front/src/components/__tests__/Modal.test.tsx`

## テストケース一覧

### 正常系

| # | テストケース | 入力 | 期待結果 | テスト種別 | 優先度 |
|---|---|---|---|---|---|
| N-1 | isOpen=true → 確認ボタンとキャンセルボタンが表示される | `isOpen=true` | 確認ボタン・キャンセルボタンが DOM に存在する | Unit | High |
| N-2 | isOpen=true → body.style.overflow が "hidden" になる | `isOpen=true` | `document.body.style.overflow === "hidden"` | Unit | High |
| N-3 | isOpen=false（閉じた後） → body.style.overflow が復元される | open → close | `document.body.style.overflow` が hidden でない | Unit | High |
| N-4 | 確認ボタンクリック → onConfirm が呼ばれ onClose が呼ばれる | onConfirm が resolve する関数 | `onConfirm` 1回呼ばれ、完了後 `onClose` 1回呼ばれる | Unit | High |
| N-5 | 処理中は確認ボタンが disabled になり "処理中..." と表示される | onConfirm が pending の Promise | ボタン `disabled=true`, テキスト "処理中..." | Unit | High |
| N-6 | variant=danger → 危険アイコンとボタンが表示される | `variant="danger"` | AlertTriangle アイコンが存在する | Unit | Low |
| N-7 | variant=info → インフォアイコンが表示される | `variant="info"` | Info アイコンが存在する | Unit | Low |

### 準正常系

| # | テストケース | 入力 | 期待結果 | テスト種別 | 優先度 |
|---|---|---|---|---|---|
| S-1 | 確認ボタンを連打 → onConfirm は 1 回しか呼ばれない | 確認ボタンを素早く 2 回クリック | `onConfirm` の呼び出し回数 === 1 | Unit | High |
| S-2 | onConfirm が失敗 → onClose が呼ばれない（モーダルが閉じない） | onConfirm が throw する関数 | `onClose` 呼ばれない、ボタン再び有効になる | Unit | High |
| S-3 | 処理中にキャンセルボタンをクリック → 無効（onClose 呼ばれない） | onConfirm が pending 中にキャンセル | `onClose` 呼ばれない | Unit | Medium |
| S-4 | 処理中にオーバーレイクリック → 無効（onClose 呼ばれない） | onConfirm が pending 中にオーバーレイクリック | `onClose` 呼ばれない | Unit | Medium |

### 異常系

| # | テストケース | 入力 | 期待結果 | テスト種別 | 優先度 |
|---|---|---|---|---|---|
| A-1 | onConfirm が例外 → isSubmitting が false に戻る（再操作可能） | onConfirm が throw | `isSubmitting` が false に戻り、確認ボタンが再び有効 | Unit | High |

## テスト構成

### ユニットテスト
- 対象ファイル: `front/src/components/Modal.tsx`
- テストファイル: `front/src/components/__tests__/Modal.test.tsx`
- モック対象:
  - `framer-motion` → `vi.mock("framer-motion")` でアニメーションをスタブ化（DOM 操作に集中するため）
  - `lucide-react` → モック不要（SVG として描画される）

## 対象外コンポーネントについて

`VideoCard.tsx`、`Pagination.tsx` はデータ表示のみのシンプルな props → JSX マッピングであり、
複雑なロジック（副作用・状態管理・外部 I/O）がない。
これらは以下で十分にカバーできると判断し、個別の unit テスト設計は省略する:

- ロジック部分 → `useVideos`（フック unit テスト: `02-unit-hooks.md`）
- UI 表示・操作 → 既存 E2E (`public.spec.ts`) + 管理者フロー E2E (`04-e2e-admin.md`)

## モック方針

- `framer-motion` のアニメーションはテストの安定性のためスタブ化する
  - `AnimatePresence` → `({ children }) => children`
  - `motion.div` → `div` として描画
- `document.body.style.overflow` は JSDOM で実際に操作される（モック不要）
