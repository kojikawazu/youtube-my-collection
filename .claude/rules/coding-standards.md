---
description: コーディング規約
globs: 
---

# コーディング規約

- **言語**: TypeScript strict モード（`strict: true`）
- **パッケージマネージャ**: pnpm を使用（npm, yarn は使用しない）
- **Linter / Formatter**: ESLint + Prettier でコード品質を担保
- **環境変数**: 設定値は環境変数で管理（.env）
- **シークレット禁止**: シークレット・認証情報をハードコードしない

## 型の規約（lint 強制）

有効ルールの唯一の真実は `front/eslint.config.mjs`。方針は以下。

- **明示的 `any` 禁止**（`@typescript-eslint/no-explicit-any`: error）: どうしても必要な箇所は `// eslint-disable-next-line` ＋ why コメントで明示する（[`jsdoc.md`](./jsdoc.md) の「キャスト・回避策には why 必須」と整合）。
- **型定義は `type` に統一**（`@typescript-eslint/consistent-type-definitions`: `["error", "type"]`）: union / 交差 / `z.infer` を表現できる上位互換のため。宣言マージが必要なグローバル拡張（`interface Window` 等）のみ `// eslint-disable-next-line` ＋ why で例外扱い。
