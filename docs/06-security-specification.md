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
- [秘匿ファイルの混入検出](#秘匿ファイルの混入検出)
- [セキュリティヘッダー](#セキュリティヘッダー)
- [レートリミット（不採用）](#レートリミット不採用)

## 認証

- Google OAuth2 ログイン
- 許可メールアドレスのホワイトリスト(1 件)
- **ホワイトリストは認証ではなく認可の関門。ログイン（セッション確立）自体は任意の Google アカウントで成立し、非許可アカウントはログイン直後の管理者判定でサインアウトさせる**（[権限制御（認可）](#権限制御認可)）
  - Supabase Auth に allowlist で OAuth を中断させる仕組みはないため、「ログインさせない」ではなく「ログイン後に弾く」構造になる
  - 副作用として、非許可アカウントも Supabase の `auth.users` に登録され、サインアウト後もレコードは残る（権限を一切持たないため実害はない）
- 一般ユーザーは閲覧のみ、管理者のみ作成/編集/削除
- Supabase の Auth Flow は PKCE を利用（`lib/supabase/client.ts` の `flowType: "pkce"`）
  - 認可コードの交換は**ログイン開始と同じブラウザクライアント**で行う（code verifier がそこにしか無いため）。`/auth/callback` はサーバーの Route Handler ではなくクライアントページ
  - `detectSessionInUrl: false` により、implicit flow の `#access_token` からセッションが確立されることはない（PKCE 以外の経路を塞ぐ）

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

- UI と API の両方でバリデーションを実施（実装: `front/src/schemas/video.ts` の `validateVideoInput`）
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
- **API ドキュメント（OpenAPI / Swagger UI）は管理者限定**:
  - `GET /api/openapi.json` は `requireAdmin`（`ADMIN_EMAIL` allowlist）で保護し、未認証は 401・非管理者は 403。
  - `/docs`（Swagger UI）はクライアントガードで、管理者セッションが無い場合はログイン誘導を表示する（スキーマ本体はサーバー側ゲートで保護されるため、HTML シェルからの露出はない）。Swagger UI は `requestInterceptor` で Bearer トークンを注入する。

## 秘匿ファイルの混入検出

鍵・証明書・`.env` 系のファイルが Git の追跡対象に入ったら CI を落とす（`.github/workflows/secret-scan.yml`、issue #190）。

- **なぜ `.gitignore` だけでは足りないか**: `.gitignore` は**未追跡のファイルにしか効かない**。`git add -f` や、新しいディレクトリでの書き漏れは止められない。さらに Git の履歴は追記型で、一度 push した秘匿ファイルは追跡を外しても履歴に残る。**混入後の対処は鍵・トークンのローテーションしかない**ため、「混入させない」（`.gitignore`）に加えて「追跡された時点で落とす」検出側を持つ。
- **検出対象**: `.env` 系（`.env` / `.env.local` / `.env.production` 等）、`*.key` / `*.pem` / `*.p12` / `*.pfx` / `*.jks` / `*.keystore`、`id_rsa` / `id_ed25519` / `id_dsa`、`credentials.json` / `serviceAccountKey.json`。
- **除外**: テンプレート（`*.example` / `*.sample` / `*.template` / `*.dist`）と TypeScript の型定義（`*.env.d.ts`）。値を持たないため、検出すると誤検知になる。
- **実装**: 判定は `scripts/check-secret-files.sh`、分類のテストは `scripts/check-secret-files.test.sh`。CI とローカルは同じ `make secret-scan` を実行する。
- **範囲**: 追跡中のファイル名だけを見る（`git ls-files`）。**ファイルの中身（ソースコードに直書きされたトークン等）や過去の履歴は検査しない**。導入前に全履歴のファイル名・内容を走査し、混入が 0 件であることは確認済み（issue #190）。

## セキュリティヘッダー

全レスポンスに以下のヘッダーを付与する（issue #192）。実装は `front/src/lib/security-headers.ts` の `buildSecurityHeaders`（純粋関数）で、`front/next.config.ts` の `headers()` から呼ぶ。

> **CSP は強制モード**（`Content-Security-Policy`）。PR #200 で Report-Only（観測モード）として導入し、本番で違反 0 件を確認してから強制へ切り替えた（issue #192）。CSP 以外の 4 ヘッダーは導入時から強制している（壊しうる機能が無いため）。

### ヘッダー一覧

| ヘッダー | 値 | 目的 |
|---|---|---|
| `Content-Security-Policy` | 下記「CSP のディレクティブ」 | XSS が成立した際に、外部スクリプトの読み込みや外部への送信を止める最後の砦。**Supabase のセッションは `localStorage` にあるため、XSS はそのままアクセストークンの奪取につながる** |
| `X-Content-Type-Options` | `nosniff` | MIME スニッフィングで意図しない形式として解釈させない |
| `X-Frame-Options` | `DENY` | クリックジャッキング対策（古いブラウザ向けに CSP の `frame-ancestors` と多層） |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 外部遷移時はオリジンだけを送り、URL のパスを漏らさない |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 使っていないデバイス権限を無効化する |

### CSP のディレクティブ

| ディレクティブ | 値 | 理由 |
|---|---|---|
| `default-src` | `'self'` | 明示しないものは自オリジンに限る（iframe・外部フォント・`<form>` の送信先は使っていない） |
| `base-uri` / `form-action` | `'self'` | `<base>` の差し替え・フォームの外部送信を防ぐ |
| `object-src` | `'none'` | プラグイン埋め込みを一切許可しない |
| `frame-ancestors` | `'none'` | 自サイトを iframe に埋め込ませない |
| `script-src` | `'self' 'unsafe-inline' https://cdn.jsdelivr.net`（dev のみ `'unsafe-eval'` を追加） | `'unsafe-inline'` は Next.js のハイドレーション用インラインスクリプトのため。`cdn.jsdelivr.net` は `/docs` の Swagger UI（SRI 付き） |
| `style-src` | `'self' 'unsafe-inline' https://cdn.jsdelivr.net` | framer-motion・`style` 属性のインラインスタイルと Swagger UI の CSS |
| `img-src` | `'self' data: blob: https:` | サムネイル（YouTube・ユーザー入力の URL）と Markdown 内の画像が任意の https を参照しうるため |
| `font-src` | `'self' data:` | 外部フォントは使っていない |
| `connect-src` | `'self' <NEXT_PUBLIC_SUPABASE_URL のオリジン>` | Supabase Auth（セッション取得・トークン更新・PKCE 交換）。URL が未設定・不正なら `'self'` のみ |

- **移植元（md-view）との違い**: md-view は Swagger UI を CDN から読み込まないため `cdn.jsdelivr.net` を許可していない。本アプリでそのまま移植すると `/docs` が壊れる。
- **`'unsafe-eval'` は本番で許可しない**。dev サーバー（React の dev モード）だけに足す。
  - 本番のバンドルでは **Zod v4 が初回の検証時に `Function("")` で eval の可否を調べる**（JIT コンパイルの判定）。許可しないとページを開くたびに CSP 違反が報告されるため、`front/src/schemas/video.ts` で `z.config({ jitless: true })` を設定し、eval を一切使わせない。強制モードでも Zod は JIT なしへ切り替わるだけで壊れはしないが、**違反ログが本物の違反を埋もれさせる**のを避ける。フォーム規模の検証で JIT の有無の差は無い。
- **nonce 化は見送る**。`'unsafe-inline'` を外すには、リクエストごとに nonce を発行する middleware の新設が必要になる。まず強制化を先に行い、nonce 化は必要になった時点で別途判断する。

### CSP の観測記録

違反の観測は、ブラウザで `securitypolicyviolation` イベント（Report-Only でも強制でも発火する）を収集して行う。**Report-Only で違反が出ないことと、強制して壊れないことは別の観測**のため、強制へ切り替えた後に同じ導線を再度通している。

| 観測対象 | 環境 | 結果 |
|---|---|---|
| 一覧 → 詳細 → 一覧 → ログイン画面、`/docs`（未ログイン表示） | E2E（dev サーバー・dev 用ポリシー。`tests/e2e/security-headers.spec.ts` で CI 常設） | 違反 0 件 |
| 一覧・詳細・ログイン画面・`/docs`（未ログイン表示） | ローカル本番ビルド（`pnpm build && pnpm start`・キャッシュの無い新規ブラウザ） | 違反 0 件（2026-09-27） |
| Swagger UI の読み込みと描画（`swagger-ui-dist@5.17.14`・CDN・SRI） | 同上（管理者ゲートは通れないため、`useDocsPage` と同じ URL で直接読み込んで描画） | 違反 0 件 |
| `z.config({ jitless: true })` を外した場合 | 同上 | 一覧で `script-src` の eval 違反 1 件（**原因の特定と、設定が効いていることの確認**） |
| 一覧・詳細（本番の実データ）・ログイン画面・`/docs`（未ログイン表示）・Swagger UI の描画 | 本番（`https://www.mytb-collector.com`・Report-Only・キャッシュの無い新規ブラウザ） | 違反 0 件（2026-09-27） |
| 管理者導線（実 Google ログイン → 一覧 → 詳細 → 追加・編集・削除 → `/docs`） | 本番（Report-Only・管理者がブラウザのコンソールで確認） | 違反 0 件（2026-09-27） |
| **強制へ切り替えた後**: 一覧 → 詳細 → 一覧 → ログイン画面、`/docs`、Swagger UI の描画 | ローカル本番ビルド（`Content-Security-Policy`・キャッシュの無い新規ブラウザ） | 違反 0 件。詳細への遷移・Swagger UI の描画（DOM 要素 16 個）とも動作 |
| **強制へ切り替えた後**: E2E 全 31 件 | E2E（dev サーバー・強制モード） | すべて成功 |

## レートリミット（不採用）

認証・書き込み系エンドポイントへのレートリミットは**採用しない**（issue #193 で導入 → #196 で差し戻し）。

### 経緯

issue #193 で Upstash Redis（`@upstash/ratelimit`）によるレートリミットを実装した（PR #195）。本番で設定漏れのまま無防備にならないよう、本番ビルドで Upstash の環境変数を必須にしていた。Upstash を用意する前にマージしたため、**本番デプロイが失敗し続け、本番が直前の版で止まった**。ここで費用対効果を見直し、差し戻した。

### 採用しない理由

| 観点 | 評価 |
|---|---|
| 守れるもの | **小さい**。`GET /api/auth/admin` で「メールアドレスの列挙」はできない（トークンが無ければ 401、トークンから分かるのは持ち主自身が管理者かどうかだけ）。Supabase のアクセストークンは署名付き JWT で、**総当たりは現実的でない**。残る脅威は「でたらめなトークンで `supabase.auth.getUser` を大量に呼ばせる」ことだが、単一管理者の個人サイトではコスト・遅延への影響は小さい |
| 払うコスト | **大きい**。外部サービスのアカウントとシークレット 2 つの管理、管理者リクエストごとの通信 1 往復、本番ビルドが外部サービスの設定に依存すること |
| 書き込みの保護 | レートリミットが無くても、`requireAdmin`（API 層）と RLS（DB 層）の二重防御で守られている（[権限制御（認可）](#権限制御認可)・[Row Level Security (RLS)](#row-level-security-rls)） |

### 再検討する条件と選択肢

- **再検討する条件**: `/api/auth/admin` への異常なアクセスがログで観測された、Supabase Auth 側の利用量・コストが問題になった、など**実害が見えたとき**。
- **第一候補は Vercel Firewall（WAF）のレートリミットルール**。アプリのコード・外部サービス・シークレットを増やさずに、エッジで弾ける。ただし設定がリポジトリに残らないため、採用する場合はルールの内容と理由を本節に記録する。利用可能なプランは導入時に確認する。
- **アプリ内のインメモリカウンタは使わない**。サーバーレスではインスタンス間でカウンタが共有されず、「効いているつもり」になる。
