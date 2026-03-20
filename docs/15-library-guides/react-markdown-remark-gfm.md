# react-markdown + remark-gfm 解説

## 概要

- **react-markdown**: Markdown テキストを React コンポーネントとしてレンダリングするライブラリ
- **remark-gfm**: GitHub Flavored Markdown（GFM）の拡張構文を有効にするプラグイン

2つを組み合わせることで、テーブル・取り消し線・チェックボックスなどの GFM 拡張構文を含む Markdown を安全に HTML 描画できる。

## なぜ react-markdown が安全なのか

Markdown を HTML に変換して描画する方法はいくつかあるが、`react-markdown` を選ぶ理由は**セキュリティ**。

一般的な手法として innerHTML に HTML 文字列を直接挿入する方法があるが、これはユーザー入力に悪意のあるスクリプトが含まれていた場合に XSS 脆弱性となる。

`react-markdown` は Markdown → AST（構文木）→ React 要素 という流れで変換するため、生の HTML タグは**デフォルトで無視される**。ユーザー入力にスクリプトが含まれていても実行されない。

```tsx
// react-markdown: AST を構築し、React 要素として安全に描画
<ReactMarkdown>{userInput}</ReactMarkdown>
```

---

## 基本的な使い方

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {markdownText}
</ReactMarkdown>
```

### `remarkPlugins` の仕組み

react-markdown のパイプラインは以下の流れ:

```
Markdown テキスト
  ↓ remark（パーサー）
AST（抽象構文木）
  ↓ remark プラグイン（ここで remarkGfm が GFM 拡張を処理）
変換済み AST
  ↓ react-markdown
React 要素（JSX）
```

`remarkGfm` を入れないと、テーブル (`| col |`) や取り消し線 (`~~text~~`) がただの文字列として表示される。

### remark-gfm が有効にする構文

| 構文 | Markdown | 表示 |
|------|----------|------|
| テーブル | `\| A \| B \|` | テーブル |
| 取り消し線 | `~~text~~` | ~~text~~ |
| タスクリスト | `- [x] done` | チェックボックス付きリスト |
| オートリンク | `https://...` | クリック可能なリンク |

---

## 本プロジェクトでの実装（`Markdown.tsx`）

### 全体構造

```tsx
// front/src/components/Markdown.tsx
export const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(uri) => safeUri(uri)}
      components={{
        h1: ({ children }) => <h1 className="...">{children}</h1>,
        p:  ({ children }) => <p className="...">{children}</p>,
        a:  ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
        img: ({ ...props }) => <img {...props} loading="lazy" />,
        // ... 他の要素
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
```

### `components` prop の仕組み

`components` prop で、Markdown の各要素がどの React コンポーネントで描画されるかを上書きできる。

```tsx
// デフォルト: <h1>見出し</h1>（スタイルなし）
// カスタム:
h1: ({ children }) => (
  <h1 className="text-xl font-bold text-red-800 mt-3 mb-2">{children}</h1>
),
```

本プロジェクトでカスタマイズしている要素:

| 要素 | カスタマイズ内容 |
|------|------------------|
| `h1` ~ `h4` | Tailwind で赤系カラーとフォントサイズの階層を設定 |
| `p` | `leading-relaxed` で行間を広く、赤系テキスト色 |
| `ul` / `ol` | `list-disc` / `list-decimal` でマーカー表示、左マージン追加 |
| `li` | `leading-relaxed` で読みやすい行間 |
| `a` | 赤系下線リンク、`target="_blank"` で外部リンクを新タブで開く |
| `img` | 角丸 + ボーダー + シャドウ、`loading="lazy"` で遅延読み込み |

### `urlTransform` によるセキュリティ対策

```tsx
const safeUri = (uri?: string) => {
  if (!uri) return "";
  const trimmed = uri.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "";  // http/https 以外のスキームは空文字に変換（無効化）
};

<ReactMarkdown urlTransform={(uri) => safeUri(uri)}>
```

この関数が防いでいるもの:

| 危険な入力 | ブロック理由 |
|------------|-------------|
| `javascript:alert(1)` | `javascript:` スキームで XSS |
| `data:text/html,...` | `data:` スキームでコンテンツインジェクション |
| `vbscript:...` | レガシーブラウザ向け攻撃 |

`http://` と `https://` のみを許可し、それ以外は空文字に変換することで、リンクや画像の URL を安全な範囲に制限する。

### `rel="noopener noreferrer"` の意味

```tsx
a: ({ children, ...props }) => (
  <a {...props} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
),
```

| 属性 | 役割 |
|------|------|
| `target="_blank"` | リンクを新しいタブで開く |
| `noopener` | 新タブから元ページの `window.opener` にアクセスさせない（セキュリティ） |
| `noreferrer` | リファラー情報を送信しない（プライバシー） |

外部リンクを `target="_blank"` で開く場合、`noopener` がないと開いたページが `window.opener.location` を書き換えてフィッシングに悪用できる（タブナビング攻撃）。

---

## 使用箇所

`MarkdownRenderer` は詳細画面で「良かったポイント」と「メモ」の2箇所で使用されている。

```tsx
// page.tsx:701
<MarkdownRenderer content={selectedVideo.goodPoints} />

// page.tsx:707
<MarkdownRenderer content={selectedVideo.memo} />
```

これらのフィールドは管理者がフォームから入力する自由記述で、Markdown 構文が使える。

---

## セキュリティ設計のまとめ

本プロジェクトの仕様（`docs/04-auth-security.md`）で定められた Markdown の安全性要件:

| 要件 | 実現方法 |
|------|----------|
| 生 HTML は無効 | `react-markdown` のデフォルト動作（HTML タグは無視される） |
| 出力はエスケープ | AST → React 要素の変換時に自動エスケープ |
| 画像埋め込みは許可 | `img` コンポーネントをカスタム定義して `<img>` を描画 |
| 危険な URL は無効化 | `urlTransform` + `safeUri` で `http(s)` のみ許可 |

## 注意点

- `remarkPlugins` に渡すプラグインの順序は処理順に影響する（通常は `remarkGfm` 1 つなので気にしなくてよい）
- `react-markdown` は `rehype` プラグインもサポートする（HTML レベルの変換）。本プロジェクトでは未使用
- `components` でカスタマイズしていない要素（`blockquote`, `code`, `pre` など）はデフォルトの HTML 要素で描画される（スタイルなし）
