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
