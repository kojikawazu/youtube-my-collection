---
description: Next.js (App Router) フロントエンド設計・コンポーネント規約
globs: "front/src/components/**,front/src/app/**,front/src/hooks/**,front/src/repositories/**,front/src/lib/**,front/src/schemas/**,front/src/types/**,front/src/constants/**"
---

# フロントエンドルール（Next.js App Router）

## コンポーネント設計

プロジェクト規模・ドメイン数に応じて以下のいずれかを選択する:

| パターン | 構成 | 採用基準 |
|---|---|---|
| **アトミックデザイン** | Atoms / Molecules / Organisms / Pages | 小〜中規模・ドメインが少ない |
| **ドメイン別構成** | features/ 配下にドメイン単位で分割 | 中〜大規模・ドメインが多い |

> 本プロジェクトは **アトミックデザイン**を採用（`components/atoms` / `molecules` / `organisms`）。経緯は [`docs/notes/atomic-design-plan.md`](../../docs/notes/atomic-design-plan.md)。

## サーバー/クライアント分離

- **server-first** を基本とする。データ取得・SEO はサーバーコンポーネントで行う。
- server/client 境界を明確にするためファイルを分離する:
  - `page.tsx` — サーバーコンポーネント（データ取得・SEO・props 受け渡し）
  - `client.tsx` / `XxxClient.tsx` — クライアントコンポーネント（インタラクション・状態管理）
- **`page.tsx` にビジネスロジックを置かない。** データ取得と合成の場であり、「薄く」する必要はないが、ドメイン処理は `lib/` のサーバー関数へ出す。

### 例外: pages 層のシェルとしての `page.tsx`

**責務を持たないシェル**である場合に限り、`page.tsx` を Client Component にしてよい。

- 条件は「**フック 1 つとテンプレート 1 つを接続するだけ**」であること。`app/page.tsx` の `<HomeTemplate {...useHomeScreen()} />` が該当する（経緯は [`docs/notes/atomic-design-plan.md`](../../docs/notes/atomic-design-plan.md)）。
- **`"use client"` を付ければ何を書いてもよい、という意味ではない。** 状態・副作用・分岐・データ整形が `page.tsx` に現れた時点で例外から外れ、`client.tsx` へ分離する。上記の「ビジネスロジックを置かない」は例外時も適用される。
- **`metadata` を export する画面は分離必須。** Client Component は `metadata` を export できないため、サーバー側のページラッパー + クライアント本体に分ける（`app/docs/page.tsx` + `DocsClient.tsx` が実例）。

## ロジック分離

- **クライアントコンポーネント**のロジック（状態・副作用・データ取得・ドメイン処理）は**カスタムフック**（`hooks/`）に切り出す。コンポーネントは UI 描画に専念する。
- **サーバーコンポーネント**のデータ取得は `page.tsx` や `lib/` 内のサーバー関数で行う（hooks は使用しない）。
- **カスタムフックの戻り値は型を先に定義し、各メンバーにコメントを付ける**（戻り値を推論任せにしない）。フックの戻り値は**定義ファイルを開かずに使われる**ため、コメントが唯一の説明になる。詳細は [`jsdoc.md`](./jsdoc.md)「状態・ロジック層のコメント」に従う。
- コンポーネント内に閉じた `useState`・ハンドラ関数は一律コメント必須にしない（「なぜ」が非自明なときのみ）。

### 状態の種類で手段を分ける

| 状態の種類 | 手段 |
|---|---|
| **サーバー状態**（API から取得したデータ） | React Query / SWR |
| **クライアント状態**（UI 状態） | ローカル state。複数コンポーネントに跨り複雑なら Zustand 等 |

> 現在は React Query / SWR / Zustand のいずれも未導入で、`useVideos` が `fetch` + `useState` で自前実装している（キャッシュ無効化・デバウンスを含む）。**導入を検討する際の判断基準**として記載する。

## 状態管理・Context

> 現在 Context は未使用。**導入を検討する際の判断基準**として記載する。

- **Context は cross-cutting かつ低頻度変更**の関心事に限定する: 認証/セッション、テーマ、i18n、feature flag。
- **頻繁に変わる状態・サーバー状態を Context に載せない**（購読している全コンポーネントが再レンダリングされる）。→ React Query / Zustand へ。
- Context は関心事ごとに分割し、provider の value は memo 化する。
- **Next.js 固有**: provider は Client Component（`"use client"`）必須。Server Component は Context を参照できないため、**provider は必要な client 境界に置き、ツリー全体を包まない**（包むとページ全体がクライアント化し server-first が崩れる）。
- **Context value の各メンバーは型を先に定義してコメントを付ける**（カスタムフックの戻り値と同じ理由。[`jsdoc.md`](./jsdoc.md)）。

## 型定義

- props・state・API レスポンス型は**原則 `type`** を使う（[`typescript.md`](./typescript.md) の type/interface 方針に従う）。
- 置き場所は**参照範囲**で決める。1 ファイルに閉じる型（props 型等）はコロケーション、2 箇所以上から参照される型は `types/` へ集約する。詳細は [`typescript.md`](./typescript.md)「型定義の配置」に従う。
- `type` / `interface` は型本体・各メンバーともにコメント必須（[`jsdoc.md`](./jsdoc.md)）。
- **共通定数は `constants/` に集約する**（判断軸は型と同じ「参照範囲」。マジックナンバー・マジック文字列を直接書かない）。ただし union の元になる定数は、導出される型と**同じファイルに同居**させる。環境変数は `constants/` に置かない。詳細は [`typescript.md`](./typescript.md)「定数の配置」に従う。

## レイヤ依存の一方向ルール

**依存は上位から下位への一方向のみ**。下位レイヤが上位レイヤを import してはならない。

```text
app  →  components  →  hooks  →  repositories  →  lib / schemas  →  types / constants
（ルーティング・合成）（表示） （ロジック） （API アクセス）（純粋関数・検証）    （最下層）
```

| レイヤ | import してよい | import 禁止 |
|---|---|---|
| `app/` | `components/`, `hooks/`, `repositories/`, `lib/`, `schemas/`, `types/`, `constants/` | （なし。app は誰からも参照されない） |
| `components/` | 下位の `components/`, `hooks/`, `lib/`, `schemas/`, `types/`, `constants/` | **`app/`**（ページ固有の型・定数を含む）, **`repositories/`**（通信は `hooks/` 経由） |
| `hooks/` | `repositories/`, `lib/`, `schemas/`, `types/`, `constants/` | **`app/`**, **`components/`**（JSX を返さない） |
| `repositories/` | `lib/`, `schemas/`, `types/`, `constants/` | **`app/`**, **`components/`**, **`hooks/`** |
| `lib/` `schemas/` | `types/`, `constants/` | 上位レイヤすべて（**`lib/` は通信もしない**） |
| `types/` `constants/` | （原則どこにも依存しない） | 上位レイヤすべて |

### 通信は `repositories/` に閉じる

- **`fetch` の呼び出しは `repositories/` にだけ書く。** コンポーネント・フック・`lib/` から直接 `fetch` しない。
- `hooks/` は `repositories/` の関数を呼び、状態管理とエラーハンドリングに専念する。
- **`lib/` は純粋関数の置き場で、通信しない。** URL 組み立てやレスポンス整形のような純粋処理は `lib/`、通信そのものは `repositories/`。
- サーバーコンポーネントのデータ取得も `repositories/` の関数を呼ぶ（`page.tsx` に `fetch` を直書きしない）。

> **現状との差異**: 現在 `repositories/` は無く、`fetch` は `hooks/useVideos`・`hooks/useVideoForm`・`hooks/useAuth`・`app/docs/DocsClient.tsx` に計 6 箇所ある。本規約への移行は段階的に行う。

- **`components/` 内も一方向**にする。アトミックデザインの階層がそのまま依存の向きになる: `templates` → `organisms` → `molecules` → `atoms`。**`atoms` は `molecules` / `organisms` を import しない**（汎用度の高いものほど下位）。
- **`app/api/`（Route Handlers）から `components/` や `hooks/` を import しない**。API はサーバー側の層であり、UI 層に依存してはならない（[`api.md`](./api.md) 参照）。
- **サーバー専用モジュール（`lib/db.ts` / `lib/auth-server.ts` などシークレット・DB を触る処理）を Client Component から import しない**。`server-only` パッケージで境界を機械的に守る。**混入するとシークレットがクライアントバンドルに乗る**（[`security.md`](./security.md)）。
- **`hooks/` は JSX を返さない**。返したくなったらそれはコンポーネントであり、`components/` に置く。

### スキーマから導出した型は `schemas/` に置く（`types/` を経由しない）

**`z.infer` で導出した型は、スキーマと同じファイルから `export` する。** 利用側はそこを直接 import する。

```ts
// schemas/video.ts — スキーマと導出型を同居させる
export const videoItemSchema = z.object({ /* ... */ });
export type VideoItem = z.infer<typeof videoItemSchema>;

// 利用側
import type { VideoItem } from "@/schemas/video";
```

- **`types/` に再定義しない。** 手書きで二重定義するのは [`duplication.md`](./duplication.md) 違反であり、`types/` で `z.infer` して再 export するのも**定義を 2 箇所に見せる**ため避ける（[`typescript.md`](./typescript.md)「スキーマの配置」）。
- **`schemas/` は最下層**で、`zod` と `types/` `constants/` にしか依存しない。上の表のとおり `types/` から `schemas/` への参照は不要になるため、**レイヤの依存は一方向のまま**である。

> **経緯**: スキーマが `lib/schemas/` にあった頃は `types/index.ts` が `lib/` を参照する必要があり、「`types/` → `lib/schemas/` のみ認める」例外条項を置いていた。`src/schemas/` への移行（issue #163）で参照そのものが消えたため、**例外条項は削除した**。例外を運用し続けるより、例外が要らない構造に寄せる方が安い。

禁止例:

- `components/organisms/VideoCard.tsx` が `app/page.tsx` の型・定数を import する
- `hooks/useVideos.ts` が `components/` を import する
- 同一レイヤ間の**相互依存（循環）**（例: `A.tsx` ⇄ `B.tsx` が互いを import）

### 逆流したくなったら「共通化」で解決する

| 逆流したい理由 | 正しい解き方 |
|---|---|
| 上位の型・定数を下位でも使いたい | その型・定数を**`types/` `constants/` へ移動**し、上下双方がそこを参照する |
| 上位のロジックを下位でも使いたい | 共通処理を**下位の `hooks/` または `lib/` の純粋関数へ抽出**し、双方から呼ぶ |
| 下位から上位の状態を変えたい | **呼ばない**。**props でコールバックを受け取る**（イベントは上へ、データは下へ） |
| 子が親のレイアウトを知りたい | 知らせない。**props / children で親が渡す**（子は自分の見た目だけに責任を持つ） |

**レビュー観点**: import 文の向きを見る。下位レイヤのファイルに上位レイヤ（`app/` / `components/`）へのパスが現れていたら指摘する。Client Component がサーバー専用モジュールを引き込んでいないか。

## 型の扱い（API の形を画面に持ち込まない）

**API のレスポンス型と、画面が使う型を分ける。**

| 種類 | 役割 | 置き場所 |
|---|---|---|
| **API 契約の型** | Route Handler が返す形。サーバー側の都合で変わる | `types/`（Route Handler と画面で**共有**して 1 箇所定義にする） |
| **ビューモデル** | 画面が必要とする形。UI 要件で変わる | `types/`、単一画面用なら該当コンポーネントにコロケーション |

本プロジェクトは**一体型**（Route Handlers が API を完結させる）のため、**変換は `app/api/` 側に閉じる**。Route Handler が画面に必要な形へ整形して返し（[`api.md`](./api.md)「レスポンス整形」）、**フロント側で再変換しない**（変換層を二重に置かない）。

- **理由**: Prisma のモデル定義変更が画面のあちこちに波及するのを防ぐ。API 契約とビューは**変わる理由が違う**（[`duplication.md`](./duplication.md)「層をまたぐ型は共通化しない」）。
- 表示専用の整形（日付フォーマット・評価の星表示・区分名の解決）は**コンポーネント側**で行い、**API 契約の型に表示都合のフィールドを足さない**。
- ただし**両者が完全に一致し、変換が恒久的に無意味な場合は同じ型を使ってよい**（早すぎる抽象化を避ける）。**表示都合の差が出た時点で分ける**。

## バリデーション

- フォームバリデーションには **Zod** を使用する。[`typescript.md`](./typescript.md)「スキーマバリデーションは Zod に統一する」に従い、`yup` 等と**混在させない**。
- **スキーマを単一の真実とする**。フォームの型は `z.infer<typeof schema>` で導出し、同じ形を手書きしない。
- **クライアント検証は UX のためのものであり、セキュリティ担保ではない**。Route Handler でも必ず検証する（信頼境界が違うため、この重複は必要 — [`duplication.md`](./duplication.md)）。
- 同じ入力ルールなら、**Route Handler と同じ Zod スキーマ（`schemas/`）を共有**する。制約値だけでも定数で共有する。
- **フォームライブラリを導入する場合はアダプタ経由で既存スキーマを再利用する**（`react-hook-form` なら `zodResolver`）。スキーマを書き直さない（[`typescript.md`](./typescript.md)）。現在は未導入で、`hooks/useVideoForm` が `schemas/video` の `validateVideoInput` を直接呼んでいる。

## ディレクトリ構成

```text
front/src/
├── app/                      # ルーティング（App Router）
│   ├── page.tsx              # トップ（pages 層のシェル）
│   ├── layout.tsx
│   ├── api/                  # Route Handlers（api.md）
│   │   ├── auth/admin/
│   │   ├── videos/[id]/
│   │   └── openapi.json/
│   ├── auth/callback/        # OAuth コールバック
│   └── docs/                 # page.tsx（サーバー）+ DocsClient.tsx（クライアント）
├── components/               # アトミックデザイン（下位ほど汎用）
│   ├── templates/            # 画面全体のレイアウト
│   ├── organisms/            # 機能単位のまとまり
│   ├── molecules/            # 複数 atoms の組み合わせ
│   └── atoms/                # 最小単位
├── hooks/                    # クライアントロジック（useXxx）
├── repositories/             # API アクセス（fetch はここだけ）※未作成
├── schemas/                  # Zod スキーマ + 導出型 + 検証アダプタ
├── lib/                      # 純粋関数・サーバー専用処理（通信しない）
│   └── supabase/             # Supabase クライアント
├── constants/                # 共通定数（環境変数は置かない）
└── types/                    # 型定義（検証を伴わない純粋な型）
```

- テストは `__tests__/` に**コロケーション**する（`src/` 外に集約しない）。E2E のみ `front/tests/e2e/` に置く。
- `stores/` `contexts/` は現在存在しない。導入する場合は本ファイルの `globs` に追加する。
- `repositories/` は**規約としては定めているが未作成**（移行は段階的に行う。issue #163）。`globs` には先行して含めてある。

## インポート

- `@/*` パスエイリアスを使用する（相対パスの深いネストを避ける）。

## テスト

- E2E: Playwright（`tests/` ディレクトリ）
- 開発サーバー: `http://localhost:3000`
- **E2E は専用ポート `3100` を使い、既存サーバーを再利用しない**（`reuseExistingServer: false`）。3000 に別アプリが居座っていても影響を受けず、逆に「別アプリを黙ってテストする」事故も起きない（issue #176）
