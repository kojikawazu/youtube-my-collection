# ユニットテスト設計 — 主要コンポーネント

props 駆動の表示コンポーネント（atoms/molecules/organisms）の UT ケース。Vitest + Testing Library。**モックは I/O 相当のみ**（`framer-motion` のアニメーション、`next/image` の最適化）で、表示分岐・コールバック配線を検証する。

各テストは `src/components/**/__tests__/<name>.test.tsx`。

## atoms

| コンポーネント | ケース |
|---|---|
| `Rating` | 正: value/max を aria-label に反映・value 個だけ星が塗られる／準: max 変更・value=0 で破綻しない |
| `TagList` | 正: 各タグを `#` 付き表示／準: 空配列でチップ 0 |

## molecules

| コンポーネント | ケース |
|---|---|
| `SearchBar` | 正: value 表示（制御）・入力で `onChange(値)` |
| `SortSelect` | 正: 選択値表示・変更で `onChange(値)` |
| `Pagination` | 正: 番号ボタン/現在・総ページ表示・番号クリックで `onPageChange(n)`・「次へ」は totalPages を超えない／準: 先頭で「前へ」無効・末尾で「次へ」無効 |

## organisms

| コンポーネント | ケース |
|---|---|
| `VideoCard` | 正: タイトル/カテゴリ/評価表示・カードクリックで `onClick(video)`・管理者は削除ボタンで `onDelete(id, title)`／準: 非管理者は削除ボタン非表示 |
| `VideoList` | 正: 動画ありでカード＋ページャ表示／準: エラー表示・空（totalCount=0）でページャ無し・初回ロード中はカード非描画 |
| `VideoForm` | 正: add/edit 見出し切替・タイトル入力で `onFormChange`・評価ボタンで rating・保存/キャンセルのコールバック／準: フィールドエラー表示・エラー中の入力で `onErrorClear` |
| `LoginScreen` | 正: Google ログインで `onGoogleLogin`・戻るで `onBack` |

> モック方針は `testing.md` に準拠（外部 I/O のみモック・ビジネスロジックは実物）。フック連携ロジックはフック側 UT（02）で担保し、本層は表示と配線に集中する。
