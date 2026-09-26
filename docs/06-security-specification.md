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
- [レートリミット](#レートリミット)

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

## レートリミット

実装は `front/src/lib/rate-limit.ts` の `enforceRateLimit`（issue #193）。各 Route Handler の**先頭**で判定し、上限超過時は**トークン検証より前に** `429` で打ち切る。

### 守る対象の脅威

`GET /api/auth/admin` の脅威として当初想定した「メールアドレスの列挙」は、**本アプリでは成立しない**。Bearer トークンが無ければ 401 で判定に入らず、トークンがあっても分かるのは「**そのトークンの持ち主自身**が管理者か」だけで、任意のメールを試す経路がないため。

実際に残る脅威は次の 2 つで、レートリミットはこちらに効く。

1. **トークン検証の濫用**: 未認証の攻撃者でも、でたらめな Bearer トークンを付けて叩ける。そのたびにハンドラは `supabase.auth.getUser(token)` を呼ぶため、**外部 API 呼び出しを無制限に誘発できる**（コスト・レイテンシへの攻撃）。
2. **トークンの総当たり**: 上記と同じ経路で、有効なトークンを推測する試行を繰り返せる。

認可の防御が `requireAdmin` の 1 層だけで、試行回数に制限が無い状態を解消する（OWASP A04: 安全でない設計）。

### 保護対象と制限

| カウンタ | エンドポイント | 制限（IP ごと） | 値の根拠（想定される正常利用） |
|---|---|---|---|
| `auth-admin` | `GET /api/auth/admin` | 20 回 / 60 秒 | ページ表示・ログイン・トークン更新のたびに 1 回呼ばれる。複数タブを開いても 1 分で 20 回には届かない |
| `videos-write` | `POST /api/videos`、`PATCH` / `DELETE /api/videos/[id]` | 30 回 / 60 秒 | 管理者 1 人の手作業は 1 分に数件。`requireAdmin` で保護済みのため副次的で、通常操作を妨げない値にする |
| `openapi` | `GET /api/openapi.json` | 10 回 / 60 秒 | 管理者が `/docs` を開いたときだけ呼ばれる |

- **カウンタは対象ごとに分ける**（Upstash のキー接頭辞 `ratelimit:<カウンタ>`）。脅威が違うものを同じ枠に入れると、管理者の書き込みが管理者判定の枠を食う、といった状態になる。
- **公開の読み取り（`GET /api/videos`・`GET /api/videos/[id]`）は対象外**。公開データであり、閲覧を制限する理由がない。

### 手段の比較

| 手段 | 長所 | 短所 | 採否 |
|---|---|---|---|
| **Upstash Redis**（`@upstash/ratelimit`） | サーバーレスでもインスタンス間でカウンタを共有でき、正しく数えられる。テストを書ける。設定がリポジトリに残る | 外部サービスのアカウントと環境変数 2 つが必要。ネットワーク往復が 1 回増える | **採用** |
| Vercel Firewall / WAF | コード変更ゼロ。エッジで弾くためアプリに負荷が来ない | 設定がリポジトリに残らず、レビュー・再現ができない。テストを書けない | 併用は可（未設定） |
| インメモリカウンタ | 外部依存なし | **サーバーレスではインスタンス間で共有されず実効性が低い**。ローカルとの挙動差が大きい | 不採用（「効いているつもり」が最も危険） |

### 挙動の決定事項

| 状況 | 挙動 | 理由 |
|---|---|---|
| 上限超過 | `429 { error }` + `Retry-After`（秒） | 本文は統一エラーレスポンスに揃える。`Retry-After` は切り上げて**最低 1 秒**（`0` は「すぐ再試行してよい」の意味になり、上限超過と矛盾する） |
| アルゴリズム | スライディングウィンドウ | 固定ウィンドウは境界をまたいだ瞬間に上限の 2 倍を通せる |
| 送信元 IP が判別できない | `unknown` という単一のカウンタに寄せる | 「識別できないから制限しない」にすると、ヘッダーを欠落させるだけで抜け道になる。Vercel は `x-forwarded-for` を上書きし、外部から送られた IP を転送しないため、クライアントからは詐称できない（[Vercel: Request headers](https://vercel.com/docs/headers/request-headers)。Enterprise の trusted proxy を有効にした場合を除く） |
| Upstash への問い合わせが失敗 | 通す（フェイルオープン） | レートリミットの障害で管理者操作そのものを止める方が損害が大きい |
| 環境変数が未設定（ローカル・CI・E2E・Preview） | 無効化して通す。警告は初回 1 回だけ | テスト環境に外部サービスを要求しないため。警告を毎回出すとログが埋まり、かえって「効いていない」事実が見えなくなる |
| **環境変数が未設定（本番）** | **ビルドを失敗させる** | 実行時は未設定だと無効化される設計のため、放置すると本番が**静かに無防備になる**。`next.config.ts` が `VERCEL_ENV=production` のときに検査し、ビルドで止める。ビルド失敗なら本番は直前の正常なデプロイのまま残り、失敗が Vercel 上で見える（実行時に 503 を返す・起動時に落とす方式は、本番を壊れた状態で公開してしまうため採らない） |

- 環境変数の解釈は `front/src/lib/rate-limit-env.ts` に集約し、実行時（`lib/rate-limit.ts`）とビルド時（`next.config.ts`）で同じ判定を使う。
- `lib/rate-limit.ts` は Upstash のトークンを読むため `import "server-only"` を付ける。

### クライアントでの扱い

- 管理者判定（`repositories/auth.ts` の `fetchIsAdmin`）は `admin` / `denied` / `rate-limited` の 3 状態を返す。**429 を `denied` に混ぜない** — 混ぜると本物の管理者が「このアカウントは権限がありません」と表示され、強制サインアウトされる。
- `rate-limited` のとき、`useAuth` は**サインアウトせず**管理者状態だけを解除し、「しばらく待ってから再度お試しください」とトースト表示する（管理者かどうか判定できていないため、安全側に倒しつつセッションは残す。再読み込みで再判定される）。`/docs` は専用の文言を表示する。
- 文言はサーバーの 429 本文とクライアント表示で共有する（`front/src/constants/auth.ts` の `RATE_LIMIT_MESSAGE`）。

### 本番での有効化手順

1. Upstash で Redis データベースを作成し、REST API の URL とトークンを控える。
2. Vercel の **Production** 環境変数に `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` を設定する。**未設定のまま main にマージすると本番ビルドが失敗する**（上記のとおり意図した挙動）。
3. デプロイ後、`GET /api/auth/admin` を短時間に 21 回以上叩いて `429` と `Retry-After` が返ることを確認する。
