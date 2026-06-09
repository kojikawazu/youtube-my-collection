# lucide-react 解説

## 概要

lucide-react は SVG アイコンのライブラリ。
Feather Icons の後継で、1000 以上のアイコンを React コンポーネントとして提供する。

## 基本的な使い方

```tsx
import { Youtube, Play, Trash2 } from "lucide-react";

// そのまま JSX で使う
<Youtube className="w-5 h-5 text-white" />
```

### 主な props

| prop | 型 | 説明 |
|------|----|------|
| `className` | string | Tailwind や CSS クラスを適用 |
| `size` | number | アイコンサイズ（px）。`className` の `w-*` / `h-*` でも制御可 |
| `color` | string | アイコンの色。Tailwind の `text-*` でも制御可 |
| `strokeWidth` | number | 線の太さ（デフォルト: 2） |

### サイズ指定の2つの方法

```tsx
// 方法1: size prop（px指定）
<Youtube size={20} />

// 方法2: Tailwind クラス（本プロジェクトではこちらを採用）
<Youtube className="w-5 h-5" />
```

本プロジェクトでは Tailwind のユーティリティクラスでサイズと色を統一的に制御している。

---

## 本プロジェクトで使用しているアイコン一覧

### `page.tsx` で使用（11種類）

| アイコン | 用途 | 使用箇所 |
|----------|------|----------|
| `Youtube` | ブランドロゴ / YouTube リンク | ヘッダー、詳細画面のリンクボタン、フッター |
| `Play` | 再生ボタン | 詳細画面のサムネイル上オーバーレイ |
| `Plus` | 追加アクション | リスト画面の FAB（右下の丸ボタン） |
| `Trash2` | 削除アクション | カード上の削除ボタン、詳細画面の削除ボタン |
| `Edit3` | 編集アクション | 詳細画面の編集ボタン |
| `ChevronLeft` | 戻るナビゲーション | 詳細画面の「コレクションへ」リンク |
| `LogIn` | ログイン導線 | ヘッダーのログインボタン |
| `LogOut` | ログアウト | ヘッダーのログアウトボタン |
| `Search` | 検索 | 検索フィールドのアイコン |
| `Tag` | タグ入力 | 追加/編集フォームのタグ入力欄 |
| `Calendar` | 公開日 | 詳細画面の公開日表示 |
| `ShieldCheck` | 管理者バッジ | ヘッダーの管理者表示、ログイン画面 |

### `Modal.tsx` で使用（2種類）

| アイコン | 用途 | 使用箇所 |
|----------|------|----------|
| `AlertTriangle` | 警告（danger） | 削除確認モーダルのアイコン |
| `Info` | 情報（info） | 保存確認モーダルのアイコン |

---

## アイコンの使い方パターン（本プロジェクトの実例）

### パターン1: ボタン内のアイコン

```tsx
// 詳細画面の編集ボタン（page.tsx:632）
<button className="flex items-center gap-2 ...">
  <Edit3 className="w-3.5 h-3.5" /> 編集
</button>
```

`flex items-center gap-2` でアイコンとテキストを横並びにし、間隔を確保する。

### パターン2: アイコンのみのボタン（アクセシビリティ対応）

```tsx
// ヘッダーのログインボタン（page.tsx:447）
<button aria-label="ログイン">
  <LogIn className="w-5 h-5" />
</button>
```

テキストがない場合は `aria-label` を付けて、スクリーンリーダーにボタンの目的を伝える。
本プロジェクトでは削除ボタン・ログイン・ログアウトで `aria-label` を設定済み。

### パターン3: 装飾的なアイコン（ブランド / 背景）

```tsx
// ヘッダーロゴ（page.tsx:418）
<div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
  <Youtube className="w-5 h-5 text-white" />
</div>
```

背景色付きの `div` の中にアイコンを配置して、ロゴ風のデザインを作成。

### パターン4: 入力欄の先頭アイコン

```tsx
// 検索バー（page.tsx:479）
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300" />
  <input className="pl-10 ..." />
</div>
```

`relative` + `absolute` の配置で、入力欄の左側にアイコンを固定。
`pl-10` で入力テキストがアイコンに重ならないようにする。

### パターン5: variant に応じたアイコンの切り替え

```tsx
// Modal.tsx:78
{variant === "danger" ? (
  <AlertTriangle className="w-10 h-10" />
) : (
  <Info className="w-10 h-10" />
)}
```

削除時は警告アイコン、保存確認時は情報アイコンを出し分ける。

---

## なぜ lucide-react を選んでいるか

1. **ツリーシェイキング対応**: 使用したアイコンだけがバンドルに含まれる（named import）
2. **一貫したデザイン**: 全アイコンが同じストローク幅・角丸で統一されている
3. **SVG ベース**: ベクター画像のためどのサイズでも鮮明
4. **Tailwind との親和性**: `className` で色・サイズを制御でき、独自の CSS が不要

## 注意点

- アイコン名は PascalCase（`ChevronLeft`, `ShieldCheck` など）
- `Trash` と `Trash2` のように複数バリエーションがあるアイコンがある（本プロジェクトでは `Trash2` を使用）
- `fill-current` を使うと塗りつぶしアイコンになる（`Play` で使用: `page.tsx:658`）
