# 認証トラブルシューティング

## 目次

- [よくある原因](#よくある原因)
- [確認すべき場所](#確認すべき場所)
  - [1) Supabase側](#1-supabase側)
  - [2) Google Cloud Console側](#2-google-cloud-console側)
- [典型的なエラーと対応](#典型的なエラーと対応)
  - [redirect_uri_mismatch](#redirect_uri_mismatch)
  - [/#access_token=... で戻る](#access_token-で戻る)
  - [provider is not enabled](#provider-is-not-enabled)
- [セキュリティ注意](#セキュリティ注意)

## よくある原因

- SupabaseのAuth Flowが `Implicit` になっており、`/#access_token=...` で戻ってくる
- Google OAuthのリダイレクトURIがSupabaseのcallbackと一致していない
- SupabaseのSite URL / Redirect URLが未設定または不一致

## 確認すべき場所

### 1) Supabase側

- Authentication → Settings（またはURL Configuration）
  - Auth Flow: `PKCE` を推奨
  - Site URL: `http://localhost:3000`（本番は本番ドメインに変更）

### 2) Google Cloud Console側

- OAuth クライアント
  - 承認済みの JavaScript 生成元: `http://localhost:3000`
  - 承認済みのリダイレクト URI: `https://<project-ref>.supabase.co/auth/v1/callback`

## 典型的なエラーと対応

### redirect_uri_mismatch

- Google側のリダイレクトURIが不一致
- Supabaseの callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) をGoogle側に登録

### /#access_token=... で戻る

- Supabase側がImplicit Flow
- PKCEに変更し、`/auth/callback?code=...` で戻る構成にする
- アプリ側は `lib/supabase/client.ts` で `flowType: "pkce"` を指定済み。`detectSessionInUrl: false` のため、この形で戻ってきた場合はセッションが確立されず**ログインできないまま**になる（暗黙にフォールバックしないのが正しい挙動）

### ログイン後にトップへ戻るがログインできていない

- トップの URL に `?auth_error=<理由>` が付いていないか確認する（トーストにも理由が出る）
- `exchange_failed`: 認可コードの交換に失敗。**code verifier の不一致**が主因。ログイン開始と交換が同じブラウザ・同じ storage で行われているか確認する（別ブラウザで開き直した、シークレットウィンドウを閉じた等で verifier が失われる）
- `missing_code`: `/auth/callback` に `code` が付いていない。Supabase 側が Implicit Flow になっているか、`/auth/callback` へ直接アクセスした場合
- `auth_config_error`: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` の未設定

### provider is not enabled

- Supabase側でGoogle Providerが未有効
- Authentication → Providers でGoogleをEnable

## セキュリティ注意

- トークンがURLに露出するImplicit Flowは避け、PKCEを推奨
- `service_role` キーはサーバー側のみで使用
- `.env.local` はコミットしない
