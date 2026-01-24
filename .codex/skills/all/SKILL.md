---
name: front-implementation-workflow
description: front/ に Next.js 実装を追加・修正する時の標準手順。base/ のUI再現、インメモリ運用、ブランチ+PR運用、push前の確認を徹底する。
---

# 目的
- `front/` に新規実装・改修を行う
- `base/` のデザイン/構成を再現する
- 初期はインメモリ、後で Supabase に移行できるように設計する
- 変更はブランチを切って PR で統合する

# 適用範囲（いつこのスキルを使うか）
- `front/` の画面/コンポーネント/API Route Handlers を触る作業
- UI を `base/` に寄せる作業
- Supabase/Prisma 移行の下準備（ただし段階的に）

# 制約（必ず守る）
- フロントは `front/` 配下のみで作業する（必要がない限り他は触らない）
- UI は `base/` を参照して見た目/構成を揃える（色・余白・フォント・コンポーネント粒度）
- 初期データはインメモリ（`front/src/lib/` 等）。DB前提の複雑化をしない
- 変更はブランチを切る。PRに「変更点/影響/確認方法」を書く
- push 前に必ず：変更内容まとめ / 動作確認結果 / 次にやるべきこと を提示して相談する
- 🚫 **マイグレーション禁止**（`prisma migrate*` / `db push` / SQLマイグレーション作成を行わない）
- ✅ Prisma は **`prisma pull` でスキーマ同期**するところまで
- ✅ `prisma pull` 後は **生成されたファイルを“手動で書き換えるまで”**（例：型・命名・relation整理・必要な model の調整）
- ✅ DB 変更が必要そうな場合は、**提案だけ出して止める**（実行しない）

# 作業手順（標準フロー）
## 1. 着手前
- 目的と対象ファイルを特定する
- `base/` で該当UIを確認し、再現に必要な要素をメモする
- 影響範囲（ルーティング/状態/型/コンポーネント）を整理する

## Prisma / DB 触るときのフロー（マイグレーションなし）
1. 変更目的を整理（何のデータが必要か、UI/APIにどう効くか）
2. `prisma pull` を実行して現状同期
3. 生成物を手動調整（命名・モデル整理・不要な差分整理）
4. マイグレーションはしない。DB側変更が必要なら「提案」して相談で止める

## 2. 実装
- 型は `front/src/lib/types.ts` を基準に増やす（破壊的変更を避ける）
- データは `front/src/lib/sample-videos.ts` 等のインメモリに寄せる
- UI は既存コンポーネントを優先して再利用（Modal/MarkdownRenderer/Rating）
- ページは `front/src/app/` の規約に従う（構成は既存に揃える）

## 3. 検証（最低限）
- 画面の主要導線：リスト→詳細、ログイン、追加、編集、削除を確認
- 例外：空データ / 不正ID / バリデーションエラー を確認
- 必要なら `npm run lint` / `npm test` / `npm run build` を実行（プロジェクトのscriptsに従う）

## 4. PR準備（push前チェック）
- 変更点を箇条書きでまとめる
- 影響範囲（どの画面/機能）と、手動確認手順を書く
- 「次にやるべきこと」候補を提案して、push/PRを出す前に相談する

# 重要ファイル（頻出）
- `front/src/app/page.tsx`
- `front/src/components/Modal.tsx`
- `front/src/components/MarkdownRenderer.tsx`
- `front/src/components/Rating.tsx`
- `front/src/lib/types.ts`
- `front/src/lib/sample-videos.ts`

# 現状メモ
- 実装済み/未実装は `docs/STATUS.md` を参照（このSKILL.mdには書かない）
