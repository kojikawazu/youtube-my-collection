# 管理者メール露出対策: `NEXT_PUBLIC_ADMIN_EMAIL` 廃止

## 背景
- `NEXT_PUBLIC_*` 環境変数はクライアントバンドルに含まれるため、秘密情報の保持には不適切。
- 管理者メールのallowlist判定はサーバー側に集約すべき。

## 目的
- クライアントコードから `NEXT_PUBLIC_ADMIN_EMAIL` 依存を除去する。
- 管理者判定を `ADMIN_EMAIL` のサーバー判定に一本化する。
- 既存仕様「許可メール以外は拒否」を維持する。

## 実施計画
1. クライアントの `isAdminEmail` 判定を削除する。
2. ログインセッション取得時・Auth状態変化時に `/api/auth/admin` を呼んで管理者判定する。
3. 非管理者は即時サインアウトし、管理操作不可の状態に戻す。
4. 環境変数ドキュメントから `NEXT_PUBLIC_ADMIN_EMAIL` を削除する。
5. `rg -n "NEXT_PUBLIC_ADMIN_EMAIL"` で参照ゼロを確認する。

## 受け入れ基準
- `front/src/` 配下で `NEXT_PUBLIC_ADMIN_EMAIL` 参照がない。
- 管理者メール一致ユーザーのみ管理UIが有効になる。
- 管理者メール不一致ユーザーはログイン後に拒否される。
- 追加/編集/削除APIのサーバー側保護 (`ADMIN_EMAIL`) が維持される。

## 非対象
- 管理者複数化。
- RBAC導入。
- Supabase設定画面の運用変更。

## 実施結果（2026-02-12）
- `front/src/lib/auth.ts` から `NEXT_PUBLIC_ADMIN_EMAIL` と `isAdminEmail` を削除。
- `front/src/app/page.tsx` は `/api/auth/admin` によるサーバー判定へ変更。
- `docs/04-auth-security.md`, `docs/11-supabase-setup.md` を `ADMIN_EMAIL` のみの記載へ更新。
- `front/src/` 配下で `NEXT_PUBLIC_ADMIN_EMAIL` 参照ゼロを確認。

## 追加対応（2026-02-12）
- 変更直後に `/api/auth/admin` が401となる事象を確認。
- 原因はBearerトークン処理の差分（`Authorization` ヘッダーの扱い）で、書き込み系APIと検証経路が一致していなかったこと。
- `route.ts` を修正し、`Authorization` からトークンを抽出して `supabase.auth.getUser(token)` で検証する方式に統一。
- 401解消を確認済み。

## 検証
- `npm run lint`（エラーなし）
- `npm run build`（成功）
