# 認証トラブルシューティング

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

### provider is not enabled
- Supabase側でGoogle Providerが未有効
- Authentication → Providers でGoogleをEnable

## セキュリティ注意
- トークンがURLに露出するImplicit Flowは避け、PKCEを推奨
- `service_role` キーはサーバー側のみで使用
- `.env.local` はコミットしない
