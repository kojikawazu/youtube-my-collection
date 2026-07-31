# テスト設計: Modal コンポーネント ユニットテスト

## 目次

- [対象](#対象)
- [テストケース一覧](#テストケース一覧)
  - [正常系](#正常系)
  - [準正常系](#準正常系)
  - [異常系](#異常系)
  - [アクセシビリティ（キーボード / ARIA）](#アクセシビリティキーボード--aria)
- [テスト構成](#テスト構成)
  - [ユニットテスト](#ユニットテスト)
- [対象外コンポーネントについて](#対象外コンポーネントについて)
- [モック方針](#モック方針)

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
| N-3 | isOpen=false（閉じた後） → body.style.overflow が復元される | open → close | `document.body.style.overflow === "unset"`（`Modal.tsx` のクリーンアップが `previousOverflow \|\| "unset"` を設定するため、初期値 `""` の場合 `"unset"` になる） | Unit | High |
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

### アクセシビリティ（キーボード / ARIA）

| # | テストケース | 入力 | 期待結果 | テスト種別 | 優先度 |
|---|---|---|---|---|---|
| Y-1 | dialog として公開され、title/message が名前・説明になる | `isOpen=true` | `role="dialog"` / `aria-modal="true"`、アクセシブル名 = title、説明 = message | Unit | High |
| Y-2 | 開いたらダイアログ内へフォーカスが移る | `isOpen=true` | 確認ボタンがフォーカスされる | Unit | High |
| Y-3 | 閉じたら開く前の要素へフォーカスが戻る | open → close | 直前にフォーカスしていた要素が再びフォーカスされる | Unit | High |
| Y-4 | Escape で閉じる | Escape キー | `onClose` が 1 回呼ばれる | Unit | High |
| Y-5 | Tab が末尾から先頭へ循環する | キャンセルにフォーカス → Tab | 確認ボタンへフォーカスが移る | Unit | High |
| Y-6 | Shift+Tab が先頭から末尾へ循環する | 確認にフォーカス → Shift+Tab | キャンセルボタンへフォーカスが移る | Unit | High |
| Y-7 | 送信中の Escape では閉じない | onConfirm が pending 中に Escape | `onClose` は呼ばれない | Unit | Medium |

## テスト構成

### ユニットテスト

- 対象ファイル: `front/src/components/Modal.tsx`
- テストファイル: `front/src/components/__tests__/Modal.test.tsx`
- モック対象:
  - `framer-motion` → `vi.mock("framer-motion")` でアニメーションをスタブ化（DOM 操作に集中するため）
  - `lucide-react` → モック不要（SVG として描画される）

## 対象外コンポーネントについて

> 補足: `VideoCard.tsx` / `Pagination.tsx` の UT は現在 [`06-unit-organisms.md`](./06-unit-organisms.md) で設計している。以下は本ファイル作成時点（06 追加前）の判断の記録。

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
