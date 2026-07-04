# その他仕様書

用語集・補足資料・参照索引をまとめる。

## 目次

- [用語集](#用語集)
- [補足資料の索引（notes/）](#補足資料の索引notes)
- [コーディング規約・命名](#コーディング規約命名)
- [コメント・JSDoc 方針](#コメントjsdoc-方針)
- [参照ライブラリ](#参照ライブラリ)

## 用語集

| 用語 | 説明 |
|------|------|
| コレクション | 良かった YouTube 動画を蓄積・公開する本サービスの一覧 |
| 管理者 | `ADMIN_EMAIL` に一致する単一ユーザー。CRUD を行える |
| allowlist | 管理者メールのホワイトリスト（1 件、サーバー側のみ保持） |
| VideoEntry | 動画 1 件を表す Prisma モデル / テーブル |
| FAB | Floating Action Button（管理者向けの追加ボタン） |

## 補足資料の索引（`notes/`）

標準仕様書に収まらない運用・履歴・参考資料は `notes/` 配下に整理している。

| 資料 | 内容 |
|------|------|
| [`notes/atomic-design-plan.md`](./notes/atomic-design-plan.md) | Atomic Design 段階的導入計画（コンポーネント分割） |
| [`notes/go-echo-backend-plan.md`](./notes/go-echo-backend-plan.md) | Go + Echo 共通バックエンドへの API 移行計画 |
| [`notes/oauth-sequence.md`](./notes/oauth-sequence.md) | OAuth 認証のシーケンス図 |
| [`notes/list-loading-optimization.md`](./notes/list-loading-optimization.md) | リスト画面ローディング高速化の実施詳細 |
| [`notes/auth-troubleshooting.md`](./notes/auth-troubleshooting.md) | 認証トラブルシューティング |
| [`notes/admin-email-exposure-mitigation.md`](./notes/admin-email-exposure-mitigation.md) | 管理者メール露出対策の実施経緯 |
| [`notes/gemini-ui-prompt.md`](./notes/gemini-ui-prompt.md) | UI 生成に使った Gemini プロンプト |
| [`notes/library-guides/`](./notes/library-guides/) | ライブラリ利用ガイド（framer-motion / lucide-react / react-markdown / youtube-thumbnail） |
| [`notes/bug-reports/`](./notes/bug-reports/) | 過去のバグレポート |

## コーディング規約・命名

- 言語: TypeScript + React（Next.js App Router）+ Tailwind CSS
- コンポーネントファイルは `PascalCase`（例: `Modal.tsx`）。Atomic Design で `atoms / molecules / organisms` に配置
- ルートは `front/src/app/` 配下に Next.js 規約で配置（`page.tsx` / `layout.tsx` / `route.ts`）
- ロジックは小さく焦点を絞ったヘルパーとして `front/src/lib/`・フックとして `front/src/hooks/` に置く
- Prisma スキーマは手書きせず `prisma db pull` で取り込む

## コメント・JSDoc 方針

**関数・カスタムフック・コンポーネントには原則すべて、先頭に 1 行（必要なら数行）の意図コメントを付ける。** 後から読み返したときに「本文を追わなくても何をするか分かる」状態を優先する。内部のヘルパー関数・`useCallback` / `useEffect` も対象（効果には `//` 行コメントでも可）。

一貫して付けることで「これは書くべきか？」の判断コストをなくし、どの関数にも先頭に説明がある均一な読み心地を保つ。

**書き方の規律（TypeScript strict 前提 / TSDoc スタイル）**

- **型は書かない**。`@param {string}` のような型ブレースは付けない（型は TS シグネチャが唯一の真実。二重管理・型ずれの原因）。
- **全引数を `@param` で説明する**。JSDoc ブロックを持つ関数は、全引数に `@param 名 説明` を付ける（型は書かず「何を表す値か / 非自明な制約」を書く）。
  - 分割代入 props（コンポーネントの `{ a, b }: XxxProps`）は型が真実なので `props.x` 単位には展開しない。
- **`@returns` で返り値を説明する**（`.ts` のフック / lib / API）。返り値の意味・形を書く。React コンポーネント（`.tsx`）は「@returns …の要素」がノイズになるため要求しない。
- **「何を / なぜ」を簡潔に**。実装の逐次翻訳ではなく、役割・非自明な契約・分岐理由・副作用を書く。
  - 例: 認可の 401/403 の切り分け理由、フォールバック値の理由、正規表現の対応形式、遅延実行や再取得のタイミング
- カスタムフック/コンポーネントは先頭に「まとまりとしての役割」を書く（何の状態機械か、返り値・表示の責務）
- 言語は日本語、`/** */`（複数行や公開 API）または `//`（短い補足・効果）を使い分ける
- 自明な 1 行 setter も一貫性のため短く付けてよいが、冗長・実装追認のコメントは避ける

**Lint による強制（`eslint-plugin-jsdoc`）**

機械的に判定できる違反を lint に委ね、それ以外（コメントの質）はレビューで担保する。有効ルールの唯一の真実は `front/eslint.config.mjs`（`src/**/*.{ts,tsx}`、`settings.jsdoc.mode = "typescript"`）。

| ルール | 重大度 | 目的 |
|---|---|---|
| `jsdoc/no-types` | error | JSDoc への型の再掲を禁止（TS シグネチャが唯一の真実） |
| `jsdoc/require-param` | error | 全引数を `@param` で説明（分割代入 props は非展開: `checkDestructured: false`） |
| `jsdoc/require-param-description` | error | `@param` に説明文を必須化 |
| `jsdoc/check-param-names` | error | `@param` 名と実引数名の突き合わせ（ズレ・順序・過不足を検出） |
| `jsdoc/require-returns` | error | 返り値のある関数に `@returns` を要求（`.tsx` コンポーネントは除外） |
| `jsdoc/require-returns-description` | error | `@returns` に説明文を必須化 |
| `jsdoc/check-alignment` / `jsdoc/no-multi-asterisks` | warn | JSDoc の体裁 |

**採用しないルール**: `jsdoc/require-jsdoc`（`/** */` の有無しか見ず、許容している `//` 行コメントを誤検知する。ブロックの有無・質はレビューで確認する）。

> lint が担保するのは「型を再掲していないか」「`@param` / `@returns` が揃っているか」等の**構造**まで。説明が意味を持つか（実装追認になっていないか）という**質**はレビューで確認する。

## 参照ライブラリ

| ライブラリ | 用途 | ガイド |
|-----------|------|--------|
| framer-motion | 画面遷移・モーダルのアニメーション | [`notes/library-guides/framer-motion.md`](./notes/library-guides/framer-motion.md) |
| lucide-react | アイコン | [`notes/library-guides/lucide-react.md`](./notes/library-guides/lucide-react.md) |
| react-markdown + remark-gfm | Markdown 表示（生 HTML 無効） | [`notes/library-guides/react-markdown-remark-gfm.md`](./notes/library-guides/react-markdown-remark-gfm.md) |
| （YouTube サムネ生成） | URL から `hqdefault.jpg` を生成 | [`notes/library-guides/youtube-thumbnail.md`](./notes/library-guides/youtube-thumbnail.md) |
