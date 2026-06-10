# セキュリティ仕様書

認証・認可・入力バリデーション・データ保護方針を定義する。OAuth の詳細シーケンスは [`notes/oauth-sequence.md`](./notes/oauth-sequence.md)、トラブルシューティングは [`notes/auth-troubleshooting.md`](./notes/auth-troubleshooting.md) を参照。

## 目次

- [認証](#認証)
- [権限制御（認可）](#権限制御認可)
  - [管理者メール露出対策（決定事項）](#管理者メール露出対策決定事項)
- [入力バリデーション](#入力バリデーション)
- [Markdown 安全性](#markdown-安全性)
- [Row Level Security (RLS)](#row-level-security-rls)
- [公開範囲](#公開範囲)

## 認証

- Google OAuth2 ログイン
- 許可メールアドレスのホワイトリスト(1 件)
- 一般ユーザーは閲覧のみ、管理者のみ作成/編集/削除
- Supabase の Auth Flow は PKCE を利用

## 権限制御（認可）

- Supabase Auth でログイン済みかつメール一致のみ管理者扱い
- 許可メールはサーバー環境変数 `ADMIN_EMAIL` で管理（**クライアントへ露出しない**）
- API 側で必ず管理者チェックを実施（画面の表示制御だけに依存しない）
- ログイン成功でも許可メール不一致なら管理者操作は拒否
- 許可メール不一致の場合はログアウト状態に戻し通知を表示

### 管理者メール露出対策（決定事項）

- `NEXT_PUBLIC_ADMIN_EMAIL` は**廃止**（`NEXT_PUBLIC_*` はクライアントバンドルに含まれ秘密保持に不適切なため）
- 管理者判定はサーバー側 `ADMIN_EMAIL` に一本化
- クライアントはログイン/Auth 状態変化時に `GET /api/auth/admin` を呼んで判定し、非管理者は即時サインアウト
- 実施経緯の詳細は [`notes/admin-email-exposure-mitigation.md`](./notes/admin-email-exposure-mitigation.md) を参照

## 入力バリデーション

| フィールド | ルール |
|-----------|--------|
| タグ | 各 10 文字以内、自由入力 |
| カテゴリ | 10 文字以内 |
| 良かったポイント | 2000 文字以内 |
| メモ | 2000 文字以内 |
| 良かったレベル | 1-5 |

- UI と API の両方でバリデーションを実施（実装: `front/src/lib/validation.ts`）
- エラー時は入力欄の背景とメッセージで強調表示

## Markdown 安全性

- 生 HTML は無効
- 出力はエスケープ
- 画像埋め込みは許可

## Row Level Security (RLS)

- `VideoEntry` テーブルで RLS を有効化済み
- ポリシー:
  - `Public read access`: SELECT を全ロールに許可（公開コレクションのため）
  - INSERT/UPDATE/DELETE: ポリシーなし（デフォルト拒否）
- Supabase REST API (PostgREST) を直接叩いても `anon` ロールでは書き込み不可
- Prisma (`DATABASE_URL`) は `postgres` ロール（テーブルオーナー）で接続するため RLS をバイパスし、Next.js API 経由の CRUD は正常動作
- 書き込み保護は **RLS（DB 層）と `requireAdmin`（API 層）の二重防御**

## 公開範囲

- リスト/詳細は完全公開
- 管理者操作は認証と権限で保護（API のステータスコード契約は [`07-api-specification.md`](./07-api-specification.md) を参照）
