# バグレポート: /api/videos POST が 403 になる

## 概要
- 発生日時: 2026-01-26
- 影響: 追加・編集・削除系の API が 403 となり管理者操作が不能
- 影響範囲: `/api/videos` の POST（PATCH/DELETE も同様の認証経路）

## 症状
- ブラウザから `Authorization: Bearer <token>` が送られているにも関わらず 403
- サーバーログ:
  - `authErrorMessage: 'This endpoint requires a valid Bearer token'`
  - `emailMasked: ''`

## 原因
- Bearer トークン抽出の正規表現が誤っており、`Bearer ` を除去できていなかった
- その結果、Supabase へ `Bearer Bearer <token>` が渡され「無効な Bearer トークン」扱いになっていた

## 対応
- `Authorization` からトークンを抽出し、`supabase.auth.getUser(token)` に明示的に渡す
- 正規表現を `^Bearer\s+` に修正し、`Bearer ` を確実に除去
- 403 解析のための一時ログを追加（トークンや生メールは出力しない）
- 更新・削除系（PATCH/DELETE）でも同様に共通化して対応
- 共通の認証ガードを導入し、ログを強化（Bearer 形式・トークン長・Supabase エラー）を記録

## 修正コード
- `front/src/app/api/videos/route.ts`
  - `authHeader.replace(/^Bearer\s+/i, "").trim()`
  - `supabase.auth.getUser(token)`
- `front/src/lib/auth-server.ts`
  - `requireAdmin(request, context)`
- `front/src/app/api/videos/[id]/route.ts`
  - PATCH/DELETE で `requireAdmin` を使用

## 再発防止
- Bearer トークン文字列の取り扱いは必ず単体テストまたは実運用ログで検証
- サーバー側の認証エラーメッセージを短期間ログし、原因特定後に削除

## 確認手順
1. 管理者でログイン
2. `/api/videos` に POST
3. 201 が返ること
4. 403 が出る場合は `authErrorMessage` を確認
