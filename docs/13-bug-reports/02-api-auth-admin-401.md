# バグレポート: /api/auth/admin が 401 になる

## 概要
- 発生日時: 2026-02-12
- 影響: 管理者ログイン後の判定APIが401となり、管理者UIが有効化されない
- 影響範囲: `GET /api/auth/admin`

## 症状
- 有効なセッションで `Authorization: Bearer <token>` を送っても `401` が返る
- その結果、クライアント側が非管理者扱いとなりサインアウトされる

## 原因
- `/api/auth/admin` のトークン検証経路が、他の保護APIと実装差分を持っていた
- `Authorization` ヘッダーからトークンを明示抽出せず、`supabase.auth.getUser()` を呼んでいたため検証不一致が発生

## 対応
- `Authorization` から `Bearer ` を除去してトークン文字列を抽出
- `supabase.auth.getUser(token)` に統一して検証
- トークン未取得時は `401` を返す

## 修正コード
- `front/src/app/api/auth/admin/route.ts`
  - `authHeader.replace(/^Bearer\\s+/i, "").trim()`
  - `supabase.auth.getUser(token)`

## 再発防止
- Bearerトークン処理は保護APIで共通ルールに合わせる
- 認証系Route追加時は既存の `auth-server` 実装と同等の検証経路を使う
