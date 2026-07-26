---
description: Next.js (App Router) フロントエンド設計・コンポーネント規約
globs: "front/src/components/**,front/src/app/**,front/src/hooks/**,front/src/lib/**"
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
  - `client.tsx` — クライアントコンポーネント（インタラクション・状態管理）

## ロジック分離

- **クライアントコンポーネント**のロジックは**カスタムフック**（`hooks/`）に切り出す。コンポーネントは UI 描画に専念する。
- **サーバーコンポーネント**のデータ取得は `page.tsx` や `lib/` 内のサーバー関数で行う（hooks は使用しない）。

## 型定義

- props・state・API レスポンス型は**原則 `type`** を使う（[`typescript.md`](./typescript.md) の type/interface 方針に従う）。
- 置き場所は**参照範囲**で決める。1 ファイルに閉じる型（props 型等）はコロケーション、2 箇所以上から参照される型は `types/` へ集約する。詳細は [`typescript.md`](./typescript.md)「型定義の配置」に従う。
- `type` / `interface` は型本体・各メンバーともにコメント必須（[`jsdoc.md`](./jsdoc.md)）。
- **共通定数は `constants/` に集約する**（判断軸は型と同じ「参照範囲」。マジックナンバー・マジック文字列を直接書かない）。ただし union の元になる定数は、導出される型と**同じファイルに同居**させる。環境変数は `constants/` に置かない。詳細は [`typescript.md`](./typescript.md)「定数の配置」に従う。

## レイヤ依存の一方向ルール

**依存は上位から下位への一方向のみ**。下位レイヤが上位レイヤを import してはならない。

```text
app  →  components  →  hooks  →  lib（サーバー関数・API 呼び出し）  →  types / constants
（ルーティング・合成）（表示） （ロジック）        （通信・永続化）              （最下層）
```

| レイヤ | import してよい | import 禁止 |
|---|---|---|
| `app/` | `components/`, `hooks/`, `lib/`, `types/`, `constants/` | （なし。app は誰からも参照されない） |
| `components/` | 下位の `components/`, `hooks/`, `types/`, `constants/` | **`app/`**（ページ固有の型・定数を含む） |
| `hooks/` | `lib/`, `types/`, `constants/` | **`app/`**, **`components/`**（JSX を返さない） |
| `lib/` | `types/`, `constants/` | **`app/`**, **`components/`**, **`hooks/`** |
| `types/` `constants/` | （原則どこにも依存しない） | 上位レイヤすべて |

- **`components/` 内も一方向**にする。アトミックデザインの階層がそのまま依存の向きになる: `templates` → `organisms` → `molecules` → `atoms`。**`atoms` は `molecules` / `organisms` を import しない**（汎用度の高いものほど下位）。
- **`app/api/`（Route Handlers）から `components/` や `hooks/` を import しない**。API はサーバー側の層であり、UI 層に依存してはならない（[`api.md`](./api.md) 参照）。
- **サーバー専用モジュール（`lib/db.ts` / `lib/auth-server.ts` などシークレット・DB を触る処理）を Client Component から import しない**。`server-only` パッケージで境界を機械的に守る。**混入するとシークレットがクライアントバンドルに乗る**（[`security.md`](./security.md)）。
- **`hooks/` は JSX を返さない**。返したくなったらそれはコンポーネントであり、`components/` に置く。

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
- 同じ入力ルールなら、**Route Handler と同じ Zod スキーマ（`lib/schemas/`）を共有**する。制約値だけでも定数で共有する。

## インポート

- `@/*` パスエイリアスを使用する（相対パスの深いネストを避ける）。

## テスト

- E2E: Playwright（`tests/` ディレクトリ）
- Base URL: `http://localhost:3000`
