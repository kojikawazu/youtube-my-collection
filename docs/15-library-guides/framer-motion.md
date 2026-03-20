# framer-motion 解説

## 概要

framer-motion は React 向けの宣言的アニメーションライブラリ。
CSS アニメーションや `@keyframes` を手書きする代わりに、JSX の props でアニメーションを定義できる。

## 基本概念

### `motion.*` コンポーネント

通常の HTML 要素を `motion.div`, `motion.button` などに置き換えるだけで、アニメーション対象になる。

```tsx
<motion.div
  initial={{ opacity: 0 }}   // 初期状態（マウント時の出発点）
  animate={{ opacity: 1 }}   // 最終状態（目標）
  exit={{ opacity: 0 }}      // アンマウント時のアニメーション
/>
```

| prop | 役割 |
|------|------|
| `initial` | コンポーネント登場時の初期値（opacity: 0 なら透明からスタート） |
| `animate` | マウント後のアニメーション目標値 |
| `exit` | アンマウント時のアニメーション（`AnimatePresence` 内でのみ有効） |
| `transition` | duration, repeat, ease などの制御 |
| `layout` | レイアウト変化時に自動的にアニメーションする |

### `AnimatePresence`

React では要素が DOM から消えると即座に削除されるため、「退場アニメーション」は通常できない。
`AnimatePresence` で囲むと、`exit` prop のアニメーションが完了してから DOM 削除される。

```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      key="unique-key"        // ← key が重要！ React が要素の同一性を判定するため
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}   // ← AnimatePresence がないと無視される
    />
  )}
</AnimatePresence>
```

**重要**: `AnimatePresence` 直下の `motion.*` には必ず一意の `key` を付ける。
React が要素の入れ替わりを検知し、旧要素の `exit` → 新要素の `initial → animate` の順序を制御する。

### `AnimatePresence mode="wait"`

`mode="wait"` を指定すると、退場アニメーションが完了するまで次の要素が登場しない。
画面遷移のような「前画面が消えてから次画面が出る」演出に使う。

```tsx
<AnimatePresence mode="wait">
  {screen === "list" && <motion.div key="list" .../>}
  {screen === "detail" && <motion.div key="detail" .../>}
</AnimatePresence>
```

---

## 本プロジェクトでの使用箇所

### 1. 画面遷移アニメーション（`page.tsx`）

リスト / 詳細 / 追加・編集 / ログインの 4 画面を `AnimatePresence mode="wait"` で切り替えている。

```tsx
// page.tsx:458
<AnimatePresence mode="wait">
  {currentScreen === Screen.List && (
    <motion.div
      key="list"
      initial={{ opacity: 0, y: 10 }}    // 下から少しスライドしてフェードイン
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}       // 上に少しスライドしてフェードアウト
    >
      ...
    </motion.div>
  )}
  {currentScreen === Screen.Detail && (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 20 }}    // 右からスライド
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}      // 左にスライドアウト
    >
      ...
    </motion.div>
  )}
</AnimatePresence>
```

**画面ごとの演出の違い**:

| 画面 | 演出 | 意図 |
|------|------|------|
| リスト | `y: 10 → 0` | 一覧に「戻る」方向感 |
| 詳細 | `x: 20 → 0` | 「奥に入る」横方向の遷移感 |
| 追加/編集 | `scale: 0.98 → 1` | フォームが「開く」拡大感 |
| ログイン | `scale: 0.9 → 1` | カードが「ポップアップ」する感覚 |

### 2. モーダル（`Modal.tsx`）

背景のオーバーレイとダイアログ本体にそれぞれアニメーションを設定。

```tsx
// Modal.tsx:53
<AnimatePresence>
  {isOpen && (
    <>
      {/* 背景: フェードイン/アウト */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-red-950/20 backdrop-blur-md"
      />
      {/* ダイアログ本体: スケール + 上下移動 */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
      />
    </>
  )}
</AnimatePresence>
```

### 3. トースト通知（`page.tsx`）

CRUD 成功時に右上に表示される通知バナー。

```tsx
// page.tsx:1017
<AnimatePresence>
  {toastMessage && (
    <motion.div
      key="toast"
      initial={{ opacity: 0, y: -10 }}   // 上から降りてくる
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}       // 上に消える
    />
  )}
</AnimatePresence>
```

### 4. FAB（追加ボタン）（`page.tsx`）

管理者ログイン時に右下に表示される追加ボタン。

```tsx
// page.tsx:1032
<motion.button
  initial={{ scale: 0 }}    // ゼロから拡大して登場
  animate={{ scale: 1 }}
/>
```

### 5. カードの `layout` アニメーション（`page.tsx`）

```tsx
// page.tsx:513
<motion.div layout key={video.id}>
```

`layout` を指定すると、並び替えやフィルタリングでカードの位置が変わったとき、瞬間移動ではなくスムーズにスライドする。

### 6. ログイン画面のパルスアニメーション（`page.tsx`）

```tsx
// page.tsx:949
<motion.div
  animate={{ scale: [1, 1.2, 1] }}              // 1 → 1.2 → 1 を繰り返す
  transition={{ repeat: Infinity, duration: 2 }} // 無限ループ、2秒周期
/>
```

`animate` にキーフレーム配列を渡すと、CSS `@keyframes` 相当の複数段階アニメーションになる。

---

## よく使うパターンまとめ

| パターン | props |
|----------|-------|
| フェードイン/アウト | `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}` |
| スライドイン | `initial={{ x: 20 }} animate={{ x: 0 }}` |
| ポップアップ | `initial={{ scale: 0.9 }} animate={{ scale: 1 }}` |
| レイアウトアニメ | `layout` （prop だけ付ける） |
| ループアニメ | `animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}` |

## 注意点

- `exit` は **必ず `AnimatePresence` の中** でのみ動作する
- `AnimatePresence` 直下の要素には **一意の `key`** が必須
- `mode="wait"` を付けないと、退場と登場が同時に実行される（画面遷移では wait が適切）
- `layout` は便利だが、要素数が多いと描画コストが上がるため注意
