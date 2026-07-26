---
description: Next.js（Route Handlers）設計・API ルール
globs: "front/src/app/api/**"
---

# API ルール（Next.js Route Handlers / 一体型）

## 設計方針

- Next.js App Router の Route Handlers で API を完結させる（一体型）。
- 入力バリデーション・認可・レスポンス整形を担当する。ビジネスロジックは `lib/` のヘルパーに切り出し、Route Handler 自体は薄く保つ。
- 将来 Go + Echo バックエンドへ移行する計画がある（[`docs/notes/go-echo-backend-plan.md`](../../docs/notes/go-echo-backend-plan.md)）。移行時はこのルールを更新する。

## ディレクトリ構成

```
front/src/app/api/
├── auth/admin/route.ts   # 管理者判定
├── videos/route.ts       # 一覧取得（公開）/ 作成（管理者）
├── videos/[id]/route.ts  # 詳細（公開）/ 更新・削除（管理者）
└── openapi.json/route.ts # OpenAPI ドキュメント（管理者限定）
```

## 型定義

- 型は**原則 `type`** を使う（[`typescript.md`](./typescript.md) の type/interface 方針に従う）。
- 置き場所は**参照範囲**で決める。1 ファイル（Route Handler）に閉じる型はコロケーション、**画面と Route Handler の双方から参照される API 契約の型は `types/` へ集約**して 1 箇所定義にする（同じレスポンス形をフロント側と二重定義しない）。詳細は [`typescript.md`](./typescript.md)「型定義の配置」に従う。
- `type` / `interface` は型本体・各メンバーともにコメント必須（[`jsdoc.md`](./jsdoc.md)）。
- **共通定数は `constants/` に集約する**（判断軸は型と同じ「参照範囲」）。ただし union の元になる定数は、導出される型と**同じファイルに同居**させる。環境変数は `constants/` に置かない。詳細は [`typescript.md`](./typescript.md)「定数の配置」に従う。

## レスポンス整形（DB の行を素通ししない）

- **Prisma の行オブジェクトをそのまま `NextResponse.json()` に流さない**。Route Handler の責務は「**この画面に必要なものだけ**を返す」ことであり、パススルーは責務放棄にあたる。
- **公開してよいフィールドだけを厳選**して返す（内部 ID・監査カラム・`deletedAt`・管理者専用フラグを漏らさない）。**ブラウザに届いた時点で、画面に表示していなくてもユーザーは全て閲覧できる**。本プロジェクトは**公開コレクション**であり、未ログインの閲覧者にも同じ JSON が届く。
- 変換は明示的に行う（マッパー関数、Prisma の `select`、または Zod スキーマの `.pick()` / `.parse()` で通す値を確定する）。スプレッド（`{ ...row, extra }`）で組み立てない — **スキーマにカラムが増えた瞬間、自動的に公開される**。
- エラーレスポンスも整形する。**スタックトレース・SQL・Prisma の内部メッセージをそのまま返さない**（[`error-handling.md`](./error-handling.md) に従い、クライアント向けメッセージに変換する）。
- **変換は Route Handler に閉じる。フロント側で再変換しない**（変換層を二重に置かない）。フロントは API が返す型をそのまま使う（[`frontend.md`](./frontend.md)「型の扱い」と対になる規定）。
- **`app/api/` から UI 層（`components/` / `hooks/`）を import しない**。API はサーバー側の層であり、UI に依存してはならない（[`frontend.md`](./frontend.md)「レイヤ依存の一方向ルール」）。
- **理由**: 過剰公開（over-fetching / 機密漏洩）の防止、DB スキーマ変更がクライアント契約に直接漏れない疎結合化、転送量の削減。

## バリデーションの二重定義禁止

同じ入力ルールを複数箇所で別々に書かない。担当レイヤを 1 つに固定する（[`duplication.md`](./duplication.md)）。

| 検証の種類 | 担当 |
|---|---|
| **形式・構文**（必須・型・文字数・URL 形式） | Route Handler の **Zod スキーマ（`lib/schemas/`）** |
| **業務ルール**（重複チェック・状態遷移の可否） | `lib/` のヘルパー |
| **DB 制約**（一意制約・外部キー） | Prisma スキーマ（最後の砦。アプリ側検証の代わりにはしない） |

- クライアント側のフォーム検証は**信頼境界が違うための必要な重複**であり、サーバー側検証を省略する理由にはならない（[`security.md`](./security.md)）。ただし**スキーマ自体は共有**し、定義は 1 つに保つ。

## リクエストの受け渡し

- **HTTP 依存物（`NextRequest` / `Headers` / `cookies()`）を `lib/` の下流ヘルパーへそのまま渡さない**。Route Handler で必要な値だけ取り出し、**検証済みの入力型に詰め替えて**渡す。下流が HTTP に依存すると、テストも移行（[`docs/notes/go-echo-backend-plan.md`](../../docs/notes/go-echo-backend-plan.md)）も難しくなる。
- **認証ユーザー・権限はリクエストボディから受け取らない**。必ずサーバー側で解決する（`lib/auth-server.ts` の `requireAdmin`）。
- **マスアサインメント禁止**。リクエストボディを丸ごと Prisma の `create` / `update` に渡さない。**更新を許すフィールドだけを明示列挙**する（Zod スキーマで受けた値を明示的に組み立てる）。

## 共通方針

- RESTful 設計（リソース指向エンドポイント）
- レスポンス形式: JSON（`NextResponse.json()`）
- 入力バリデーションは Zod スキーマ（`lib/schemas/`）を単一ソースとする
- 認可はサーバー側 allowlist で判定する（`lib/auth-server.ts` の `requireAdmin`）
- エラー時は適切な HTTP ステータスコード（400/401/403/404/500）で返す
- API 仕様の正準は [`docs/07-api-specification.md`](../../docs/07-api-specification.md)
