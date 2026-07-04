# その他仕様書

用語集・補足資料・参照索引をまとめる。

## 目次

- [用語集](#用語集)
- [補足資料の索引（notes/）](#補足資料の索引notes)
- [コーディング規約・命名](#コーディング規約命名)
- [コメント・JSDoc 方針](#コメントjsdoc-方針)
- [参照ライブラリ](#参照ライブラリ)

## 用語集

| 用語 | 説明 |
|------|------|
| コレクション | 良かった YouTube 動画を蓄積・公開する本サービスの一覧 |
| 管理者 | `ADMIN_EMAIL` に一致する単一ユーザー。CRUD を行える |
| allowlist | 管理者メールのホワイトリスト（1 件、サーバー側のみ保持） |
| VideoEntry | 動画 1 件を表す Prisma モデル / テーブル |
| FAB | Floating Action Button（管理者向けの追加ボタン） |

## 補足資料の索引（`notes/`）

標準仕様書に収まらない運用・履歴・参考資料は `notes/` 配下に整理している。

| 資料 | 内容 |
|------|------|
| [`notes/atomic-design-plan.md`](./notes/atomic-design-plan.md) | Atomic Design 段階的導入計画（コンポーネント分割） |
| [`notes/go-echo-backend-plan.md`](./notes/go-echo-backend-plan.md) | Go + Echo 共通バックエンドへの API 移行計画 |
| [`notes/oauth-sequence.md`](./notes/oauth-sequence.md) | OAuth 認証のシーケンス図 |
| [`notes/list-loading-optimization.md`](./notes/list-loading-optimization.md) | リスト画面ローディング高速化の実施詳細 |
| [`notes/auth-troubleshooting.md`](./notes/auth-troubleshooting.md) | 認証トラブルシューティング |
| [`notes/admin-email-exposure-mitigation.md`](./notes/admin-email-exposure-mitigation.md) | 管理者メール露出対策の実施経緯 |
| [`notes/gemini-ui-prompt.md`](./notes/gemini-ui-prompt.md) | UI 生成に使った Gemini プロンプト |
| [`notes/library-guides/`](./notes/library-guides/) | ライブラリ利用ガイド（framer-motion / lucide-react / react-markdown / youtube-thumbnail） |
| [`notes/bug-reports/`](./notes/bug-reports/) | 過去のバグレポート |

## コーディング規約・命名

- 言語: TypeScript + React（Next.js App Router）+ Tailwind CSS
- コンポーネントファイルは `PascalCase`（例: `Modal.tsx`）。Atomic Design で `atoms / molecules / organisms` に配置
- ルートは `front/src/app/` 配下に Next.js 規約で配置（`page.tsx` / `layout.tsx` / `route.ts`）
- ロジックは小さく焦点を絞ったヘルパーとして `front/src/lib/`・フックとして `front/src/hooks/` に置く
- Prisma スキーマは手書きせず `prisma db pull` で取り込む

## コメント・JSDoc 方針

**関数・カスタムフック・コンポーネントには原則すべて、先頭に 1 行（必要なら数行）の意図コメントを付ける。** 後から読み返したときに「本文を追わなくても何をするか分かる」状態を優先する。内部のヘルパー関数・`useCallback` / `useEffect` も対象（効果には `//` 行コメントでも可）。

一貫して付けることで「これは書くべきか？」の判断コストをなくし、どの関数にも先頭に説明がある均一な読み心地を保つ。

**書き方の規律（TypeScript strict 前提）**

- **型に現れない情報だけを書く**。`@param {string}` のような型の再掲はしない（引数・戻り値の型はシグネチャで足りる）
- **「何を / なぜ」を簡潔に**。実装の逐次翻訳ではなく、役割・非自明な契約・分岐理由・副作用を書く
  - 例: 認可の 401/403 の切り分け理由、フォールバック値の理由、正規表現の対応形式、遅延実行や再取得のタイミング
- カスタムフック/コンポーネントは「まとまりとしての役割」を書く（何の状態機械か、返り値・表示の責務）
- 言語は日本語、`/** */`（複数行や公開 API）または `//`（短い補足・効果）を使い分ける
- 自明な 1 行 setter も一貫性のため短く付けてよいが、冗長・実装追認のコメントは避ける

> 強制はしない（`eslint-plugin-jsdoc` は未導入）。レビューで「型で分かることを書いていないか」「関数の意図が 1 行で読み取れるか」を確認する。

## 参照ライブラリ

| ライブラリ | 用途 | ガイド |
|-----------|------|--------|
| framer-motion | 画面遷移・モーダルのアニメーション | [`notes/library-guides/framer-motion.md`](./notes/library-guides/framer-motion.md) |
| lucide-react | アイコン | [`notes/library-guides/lucide-react.md`](./notes/library-guides/lucide-react.md) |
| react-markdown + remark-gfm | Markdown 表示（生 HTML 無効） | [`notes/library-guides/react-markdown-remark-gfm.md`](./notes/library-guides/react-markdown-remark-gfm.md) |
| （YouTube サムネ生成） | URL から `hqdefault.jpg` を生成 | [`notes/library-guides/youtube-thumbnail.md`](./notes/library-guides/youtube-thumbnail.md) |
