# タスク03: Supabase Auth（Google OAuth + allowlist）

## 目的
Google OAuth2とallowlistで管理者のみ操作可能にする。

## 範囲
- Supabase AuthのGoogleプロバイダ設定
- ログイン/ログアウト実装
- 管理者メールallowlistの判定
- APIルートの保護

## 手順
- SupabaseでGoogle OAuthを設定
- `front/` にAuthクライアントを追加
- ログイン/ログアウトの導線を実装
- ユーザーのメールを取得し `ADMIN_EMAIL` と一致判定
- 非許可ユーザーは管理操作を非表示
- API側でも管理者チェックを実施

## 注意
- UIだけの制御に頼らない
- サーバー側で必ず権限チェック

## 進捗
- Supabase Authクライアント追加
- OAuthコールバックのルート追加
- API保護の下準備(allowlist判定)
- allowlist不一致時はログアウト+通知

## 残り
- 完了
