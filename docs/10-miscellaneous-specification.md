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

### 必須対象（公開シンボル）

以下には必ずコメントを付ける。

- `export` された関数・型（`type` / `interface`）・定数
- **型のメンバー**（`type` / `interface` の各プロパティ、union リテラルの各値）— 次節参照
- コンポーネントの **props 型**（各プロパティに説明）
- カスタムフック（`useXxx`）と、**その戻り値の各メンバー**
- Route Handler・`lib/` の公開関数

**任意対象**: `export` されない内部関数、コンポーネント内に閉じた `useState`・ハンドラ関数、処理が自明な 1 行ユーティリティ。ただし意図が非自明なものは内部でも付与する。

### 型定義のコメント（型本体 + メンバー）

`type` は**型本体と各メンバーの両方**にコメントを付ける。型シグネチャは「形」しか語らないため、**意味・単位・制約・状態の定義**はコメントでしか残せない。

- **型本体**: 1 行目に「**何を表す型か**」を書く。どの層のものか（API レスポンス / 画面用モデル / props）も併記すると読み手が迷わない。
- **各プロパティ**: 型名から読み取れない情報を書く。特に以下は必須:
  - **単位**（`durationMs` がミリ秒か秒か）
  - **`null` / `undefined` / 省略の意味**（「未設定」なのか「該当なし」なのか）
  - **制約・不変条件**（値域、フォーマット、他プロパティとの関係）
  - 自明なプロパティ（`id` 等）は省略してよい。**書くことがない項目に埋め草コメントを付けない**。
- **union リテラル**: 各値が**どの状態を指すか**を個別に書く。値の文字列そのものからは業務上の意味が読めない。
- コロケーションした非 `export` の型も、意味が非自明なら同様に付ける。

```ts
/** 一覧の並び順。値は API の `sort` パラメータへ変換して送る。 */
export type SortOption =
  /** 追加日の新しい順（既定） */
  | "newest"
  /** 公開日の新しい順 */
  | "future"
  /** 良かったレベルの高い順 */
  | "rating";

/** 動画 1 件のレスポンス型。Zod スキーマ（`schemas/video.ts`）を単一ソースに導出。 */
export type VideoItem = {
  id: string;
  /** 表示用タイトル。前後の空白は除去済み */
  title: string;
  /** 公開日（ISO 8601 文字列）。`null` は「公開日未設定」であり「非公開」ではない */
  publishDate: string | null;
  /** 良かったレベル。1〜5 の整数のみ */
  rating: number;
};
```

> **Zod 由来の型（`z.infer`）**: 型の実体はスキーマ側にあるため、**コメントもスキーマ（`lib/schemas/`）のフィールドに書く**。導出先の `z.infer` エイリアスには型本体の説明のみ付ける（両方に書くと二重管理になる）。

### 書き方の規律（TypeScript strict 前提 / TSDoc スタイル）

- **型は書かない**。`@param {string}` のような型ブレースは付けない（型は TS シグネチャが唯一の真実。二重管理・型ずれの原因）。
- **全引数を `@param` で説明する**。JSDoc ブロックを持つ関数は、全引数に `@param 名 説明` を付ける（型は書かず「何を表す値か / 非自明な制約」を書く）。
  - 分割代入 props（コンポーネントの `{ a, b }: XxxProps`）は型が真実なので `props.x` 単位には展開しない。
- **`@returns` で返り値を説明する**（`.ts` のフック / lib / API）。返り値の意味・形を書く。React コンポーネント（`.tsx`）は「@returns …の要素」がノイズになるため要求しない。
- **意図的に例外を投げる場合は `@throws` を書く**。「どの条件で throw するか」を記述する。**型ブレース（`@throws {ErrorType}`）は書かない**（型を再掲しない方針に従う。TSDoc 標準の `{}` 付き記法は採用しない）。呼び出し側は throw の有無をシグネチャから知れないため、コメントが唯一の手掛かりになる。
- **「何を / なぜ」を簡潔に**。実装の逐次翻訳ではなく、役割・非自明な契約・分岐理由・副作用を書く。
  - 例: 認可の 401/403 の切り分け理由、フォールバック値の理由、正規表現の対応形式、遅延実行や再取得のタイミング
- カスタムフック/コンポーネントは先頭に「まとまりとしての役割」を書く（何の状態機械か、返り値・表示の責務）
- 言語は日本語、`/** */`（複数行や公開 API）または `//`（短い補足・効果）を使い分ける
- 自明な 1 行 setter も一貫性のため短く付けてよいが、冗長・実装追認のコメントは避ける

### 状態・ロジック層のコメント（カスタムフック）

カスタムフックの戻り値は、**定義ファイルを開かずに利用される**。したがって「値が何を意味するか」「関数が何を変えるか」はコメントでしか伝わらない。

#### 必須ラインは「参照範囲」で決める

型定義の配置と同じ軸を使う。

| 対象 | コメント |
|---|---|
| **ファイルを越えて使われる** — カスタムフックの戻り値の各メンバー、Context value の各メンバー、`export` された関数・定数 | **必須** |
| **ファイル内に閉じる** — コンポーネント内の `useState`・ハンドラ関数・ローカル変数 | **条件付き**（「なぜ」が非自明なときのみ） |

コンポーネント内部まで一律必須にしない。`setIsOpen` に「isOpen をセットする」と書くような**埋め草が量産され、本当に重要なコメントが埋もれる**ため。

#### 戻り値型を明示してコメントを型側に置く

フックの戻り値を**型注釈なしの推論任せ**にすると、返すオブジェクトの中身は「宣言」ではなく「式」になるため、JSDoc も lint（`jsdoc/require-param` 等は関数宣言にしか効かない）も届かない。**戻り値型を明示し、コメントは型のメンバーに書く**。こうすると型メンバーのコメント規約がそのまま効く。

```ts
// 型を先に定義 → 各メンバーの意味が型側に集まる
/** 一覧画面の取得・ページング・検索・並び替えを束ねた状態機械。 */
type UseVideosResult = {
  /** 現在ページの動画。読み込み中も直前の内容を保持する（ちらつき防止） */
  videos: VideoItem[];
  /** 取得に失敗した理由。成功時は null */
  loadError: string | null;
  /** 総件数から算出した総ページ数。0 件のときは 1 */
  totalPages: number;
};

export function useVideos(): UseVideosResult { /* ... */ }
```

> 既存フックの多くは戻り値型が推論任せ（`export function useVideos()`）。**新規・改修時に明示へ寄せる**方針とし、一括での型付けは行わない。`useHomeScreen(): HomeTemplateProps` が既に明示形になっている。

#### 書くべき内容

state / 操作関数に書くのは**シグネチャから読めない情報**に限る。

- **その値がいつ変わるか / 誰が変えるか**（「ログアウト時にリセットされる」）
- **初期値・空値の意味**（「空配列は『0 件』であり『未取得』ではない」）
- **副作用の有無**（「この関数は API を呼ばない。再取得は呼び出し側の責務」）
- **他の値との関係・不変条件**（「`currentPage` は必ず 1 以上 `totalPages` 以下」）

### 混乱テスト（公開/内部・本番/テストを問わない）

コメントを書くかの判断軸は「public か否か」ではなく、**「1 か月後の自分／他プロジェクトから戻ってきた読み手が『これは何？なぜ？』となるか」**。なるなら、`export` されていない内部関数でもテストコードでも "why" を残す。

- **キャスト・回避策には "why" 必須**: `as unknown as` / `as any` / `@ts-ignore` / `@ts-expect-error` / マジック値 / 複雑な正規表現 / 明示的なワークアラウンド。**型を欺く・仕様を迂回する箇所は、その根拠（なぜ安全か／なぜ必要か）がコードから消える**ため、コメントが唯一の記録になる。
- **テスト足場も対象**（SUT ビルダー・複雑な fixture・非自明な mock）。意図が読み取りにくいなら付ける。
  - 例: テストダブルを二段キャストで注入する場合、「ダブルは対象が実際に呼ぶメソッドだけの部分実装で、実型は構造的に大きいため二段キャストで隙間を埋める」と残す。

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
| `jsdoc/require-jsdoc`（**`src/types/**` 限定**） | error | 型本体（`TSTypeAliasDeclaration` / `TSInterfaceDeclaration`）と型メンバー（`TSPropertySignature`）のコメントを必須化 |

**`jsdoc/require-jsdoc` を関数に適用しない理由**: `/** */` の有無しか見ず、許容している `//` 行コメントを誤検知する。関数のブロックの有無・質はレビューで確認する。

**型定義への適用を `src/types/**` に絞った理由**: `src/**` 全体に適用すると **205 件**検出され、その大半は関数シグネチャ内のインラインオブジェクト型（例: `(opts: { force?: boolean })`）という誤検知だった。「書くことがない項目に埋め草コメントを付けない」方針とも衝突する。複数箇所から参照される型は `types/` へ集約する規約があるため（`typescript.md`「型定義の配置」）、`types/` を対象にすれば「**ファイルを越えて使われる型**」という必須ラインを実質的にカバーできる。

**重大度を warn にしない理由**: 「守れないルールは有効にしない（`error` にするか無効にするかの二択）」に従い、警告を恒常状態にしない。`src/types/**` に絞れば違反ゼロを維持できる。

**オブジェクトリテラルのプロパティを直接 Lint で強制しない**（宣言ではなく式のため誤検知が多く実効性が低い）。フックの戻り値・store の state は**型を先に定義する**ことで `TSPropertySignature` として同じルールに乗せる。これが「型へ寄せる」方針の要。

> lint が担保するのは「型を再掲していないか」「`@param` / `@returns` が揃っているか」等の**構造**まで。説明が意味を持つか（実装追認になっていないか）という**質**はレビューで確認する。

## 参照ライブラリ

| ライブラリ | 用途 | ガイド |
|-----------|------|--------|
| framer-motion | 画面遷移・モーダルのアニメーション | [`notes/library-guides/framer-motion.md`](./notes/library-guides/framer-motion.md) |
| lucide-react | アイコン | [`notes/library-guides/lucide-react.md`](./notes/library-guides/lucide-react.md) |
| react-markdown + remark-gfm | Markdown 表示（生 HTML 無効） | [`notes/library-guides/react-markdown-remark-gfm.md`](./notes/library-guides/react-markdown-remark-gfm.md) |
| （YouTube サムネ生成） | URL から `hqdefault.jpg` を生成 | [`notes/library-guides/youtube-thumbnail.md`](./notes/library-guides/youtube-thumbnail.md) |
