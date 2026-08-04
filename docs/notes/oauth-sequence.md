# OAuth認証 シーケンス図

## 目次

- [概要](#概要)
- [関連ファイル](#関連ファイル)
- [シーケンス図](#シーケンス図)
- [各ステップの詳細](#各ステップの詳細)
  - [① ログイン開始](#①-ログイン開始)
  - [② Google認証](#②-google認証)
  - [③ コールバック（認証の確立）](#③-コールバック認証の確立)
  - [④ 管理者判定（認可の判定）](#④-管理者判定認可の判定)
- [補足: useAuth のセッション監視](#補足-useauth-のセッション監視)

## 概要

Google OAuth認証 → Supabase Auth → 管理者判定までの全体フロー。

## 関連ファイル

| ステップ | ファイル |
|----------|---------|
| ログイン起動 | `front/src/lib/auth.ts` (`signInWithGoogle`) |
| ブラウザ用クライアント | `front/src/lib/supabase/client.ts`（`flowType: "pkce"` / `detectSessionInUrl: false`） |
| コールバック | `front/src/app/auth/callback/page.tsx` + `AuthCallbackClient.tsx` + `front/src/hooks/useAuthCallback.ts` |
| 失敗表示 | `front/src/hooks/useAuthErrorToast.ts` / `front/src/constants/auth.ts` |
| 管理者判定API | `front/src/app/api/auth/admin/route.ts` |
| セッション管理 | `front/src/hooks/useAuth.ts` |

## シーケンス図

```text
 ブラウザ(React)          Next.js Server         Supabase Auth          Google OAuth
      │                        │                       │                      │
      │  ① ログイン開始         │                       │                      │
      │─signInWithGoogle()────→│                       │                      │
      │                        │──signInWithOAuth()──→│                      │
      │←──────Google認証画面URL─│                       │                      │
      │                        │                       │                      │
      │  ② Google認証           │                       │                      │
      │────────────────────────────────────────────────────リダイレクト────────→│
      │                        │                       │    メール選択・認証    │
      │                        │                       │←──認証成功───────────│
      │                        │                       │                      │
      │                        │                       │  PKCEコード生成       │
      │                        │                       │                      │
      │  ③ コールバック(ブラウザで交換)                  │                      │
      │←──── /auth/callback?code=XXXX ─────────────────│                      │
      │──GET /auth/callback───→│                       │                      │
      │←─ページ(JS)のみ返す─────│                       │                      │
      │  useAuthCallback()     │                       │                      │
      │──exchangeCodeForSession(code)────────────────→│                      │
      │   (code verifier は同じブラウザ client の storage)                     │
      │←──────セッション確立(token)────────────────────│                      │
      │  location.replace("/") │                       │                      │
      │                        │                       │                      │
      │  ④ 管理者判定            │                       │                      │
      │  useEffect マウント     │                       │                      │
      │  initSession()         │                       │                      │
      │  getSession()          │                       │                      │
      │──GET /api/auth/admin──→│                       │                      │
      │   (Bearer token)       │──getUser(token)──────→│                      │
      │                        │←─{ email: "xxx" }────│                      │
      │                        │                       │                      │
      │                        │  email===ADMIN_EMAIL?  │                      │
      │                        │                       │                      │
      │←─{ isAdmin: true }────│                       │                      │
      │                        │                       │                      │
      │  ┌─────────────────┐   │                       │                      │
      │  │ true → 管理者UI  │   │                       │                      │
      │  │ false→ サインアウト│   │                       │                      │
      │  └─────────────────┘   │                       │                      │
      ▼                        ▼                       ▼                      ▼
```

## 各ステップの詳細

### ① ログイン開始

- ユーザーがログイン画面で「Googleでログイン」をクリック
- `signInWithGoogle()` → Supabase SDK `signInWithOAuth({ provider: "google" })`
- リダイレクト先: `${NEXT_PUBLIC_SITE_URL}/auth/callback`
- ブラウザクライアントは `flowType: "pkce"`。**このときブラウザの storage に code verifier が保存される**（③ の交換で必要）

### ② Google認証

- ブラウザがGoogleの認証画面へリダイレクト
- ユーザーがメールアドレスを選択・認証
- Google → Supabase Auth サーバーへ認証成功を通知
- Supabase が PKCE 認可コードを生成

### ③ コールバック（認証の確立）

- Supabase が `/auth/callback?code=XXXX` へブラウザをリダイレクト
- `/auth/callback` は **Route Handler ではなくクライアントページ**。`useAuthCallback` が `exchangeCodeForSession(code)` でコード → セッション交換する
- **交換をブラウザで行う理由**: PKCE の code verifier は ① で**ログイン開始時のブラウザクライアントの storage**に保存される。サーバー側で新規生成した client からは参照できず、交換が必ず失敗する（issue #165）
- PKCEコードは1回限りの使い捨て（再利用不可）。このため以下を守る
  - `detectSessionInUrl: false`（既定 true のままだと client が勝手に交換を始め、明示的な交換とコードを奪い合う）。同時に implicit の `#access_token` 取り込みも塞がれる
  - React StrictMode の effect 二重実行を ref でガードする
- セッション確立後、トップページ `"/"` へ `location.replace`（履歴を残さず、戻るで使用済みコードの URL に戻らせない）
- 失敗時は `"/?auth_error=<理由>"` へ遷移し、トップで `useAuthErrorToast` がトースト表示する（理由と文言の対応は `constants/auth.ts`）

### ④ 管理者判定（認可の判定）

- ホーム画面の `useAuth` フック内 `useEffect` がマウント時に発火
- `initSession()` → `getSession()` で既存セッションを取得
- `verifyAdminSession(token)` → `GET /api/auth/admin` に Bearer トークンを送信
- サーバー側で `supabase.auth.getUser(token)` → メールアドレス取得
- `ADMIN_EMAIL` 環境変数と照合し `{ isAdmin: boolean }` を返却
- `isAdmin: true` → 管理者UI有効化（バッジ・FAB表示）
- `isAdmin: false` → サインアウト＆「権限がありません」トースト

## 補足: useAuth のセッション監視

`useAuth.ts` のマウント時には2つの経路が同時に動作する。

| 経路 | トリガー | 用途 |
|------|---------|------|
| `initSession()` | マウント時に1回 | ページリロード時のセッション復元 |
| `onAuthStateChange()` | イベント発生時 | ログイン/ログアウト/トークンリフレッシュのリアルタイム検知 |

OAuth完了直後は `initSession()` が先に動く可能性が高い（`exchangeCodeForSession` でセッション確立済みのため）。
`onAuthStateChange` の `SIGNED_IN` イベントも発火するが、どちらも結果は同じ（管理者判定APIを叩く）。
