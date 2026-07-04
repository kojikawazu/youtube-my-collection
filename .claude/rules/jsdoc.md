---
description: JSDoc ドキュメンテーションコメント規約 — 関数・フック・コンポーネントに意図コメントを付ける
globs: front/src/**
---

# JSDoc 規約（TypeScript）

正準は [`docs/10-miscellaneous-specification.md`](../../docs/10-miscellaneous-specification.md) の「コメント・JSDoc 方針」。本ファイルはその要約。

## 基本方針

**関数・カスタムフック・コンポーネントには原則すべて、先頭に 1 行（必要なら数行）の意図コメントを付ける。** 後から読み返したときに「本文を追わなくても何をするか分かる」状態を優先する。内部のヘルパー関数・`useCallback` / `useEffect` も対象（効果には `//` 行コメントでも可）。

一貫して付けることで「これは書くべきか？」の判断コストをなくし、どの関数にも先頭に説明がある均一な読み心地を保つ。

## 記述ルール（TypeScript strict 前提 / TSDoc スタイル）

- **型は書かない**: 型は TypeScript のシグネチャが唯一の真実。JSDoc に `{string}` 等の型ブレースは書かない（二重管理・型ずれの原因）。
- **全引数を `@param` で説明**: JSDoc ブロックを持つ関数は全引数に `@param 名 説明` を付ける（型は書かず「何を表す値か / 非自明な制約」を書く）。分割代入 props は型（`XxxProps`）が真実なので `props.x` 単位に展開しない。
- **`@returns` で返り値を説明**: `.ts` のフック / lib / API は `@returns` に返り値の意味を書く。React コンポーネント（`.tsx`）は不要（「@returns …の要素」はノイズ）。
- **「何を / なぜ」を簡潔に**: 実装の逐次翻訳ではなく、役割・非自明な契約・分岐理由・副作用を書く。
  - 例: 認可の 401/403 の切り分け理由、フォールバック値の理由、正規表現の対応形式、遅延実行・再取得のタイミング。
- **フック / コンポーネントは「まとまりとしての役割」**: 何の状態機械か、返り値・表示の責務を書く。
- **記法**: 日本語。`/** */`（複数行や公開 API）と `//`（短い補足・効果）を使い分ける。
- 自明な 1 行 setter も一貫性のため短く付けてよいが、冗長・実装追認のコメントは避ける。

## キャスト・回避策には "why" 必須

`as unknown as` / `as any` / `@ts-ignore` / `@ts-expect-error` / マジック値 / 複雑な正規表現 / 明示的なワークアラウンドは、**型を欺く・仕様を迂回する根拠がコードから消える**ため、コメントが唯一の記録になる。内部・テストコードでも "why" を残す。

## 例

```ts
/**
 * 動画を削除し、削除後の件数に合わせたページへ移動して一覧を更新する。
 * 最終ページの最後の 1 件を消した場合に空ページに残らないよう、遷移先ページを補正する。
 * @param id 削除対象の動画 ID
 * @param accessToken 管理者操作の認可に使う Bearer トークン（未ログインは null）
 * @returns 削除と一覧再取得の完了を表す Promise
 */
const deleteVideo = useCallback(async (id: string, accessToken: string | null) => {
  // ...
}, []);
```

## Lint による強制

機械的に判定できる違反（JSDoc への型の再掲など）のみ lint で強制する。**有効ルール・重大度の唯一の真実は [`front/eslint.config.mjs`](../../front/eslint.config.mjs)**、採用/不採用の根拠は正準 [`docs/10-miscellaneous-specification.md`](../../docs/10-miscellaneous-specification.md) を参照（要約側でルール一覧を持たず、drift を避ける）。**コメントの有無・質はレビューで確認する。**
