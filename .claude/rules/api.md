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

## 共通方針

- RESTful 設計（リソース指向エンドポイント）
- レスポンス形式: JSON（`NextResponse.json()`）
- 入力バリデーションは Zod スキーマ（`lib/schemas/`）を単一ソースとする
- 認可はサーバー側 allowlist で判定する（`lib/auth-server.ts` の `requireAdmin`）
- エラー時は適切な HTTP ステータスコード（400/401/403/404/500）で返す
- API 仕様の正準は [`docs/07-api-specification.md`](../../docs/07-api-specification.md)
