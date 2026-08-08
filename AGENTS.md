# Repository Guidelines

## Rules

開発ルールの正本は [`.claude/rules/`](./.claude/rules/) にある（一覧は [`CLAUDE.md`](./CLAUDE.md) の `## Rules`）。本ファイルはルール本文を複製せず、参照先を示す。

常に適用するルール（対象パスの限定なし）のうち、特に作業の進め方を縛るもの:

- [`.claude/rules/pr-description.md`](./.claude/rules/pr-description.md) — PR 初回コメントの必須セクション。変更種別（バグ修正 / 仕様変更 / 仕様追加 / 新規開発）ごとに書くべき項目が固定されている。骨格は [`.github/PULL_REQUEST_TEMPLATE/`](./.github/PULL_REQUEST_TEMPLATE/) に種別別テンプレートとして置いてある。
- [`.claude/rules/lessons-learned.md`](./.claude/rules/lessons-learned.md) — 誤り・失敗・ハマりから得た教訓を [`docs/lessons-learned.md`](./docs/lessons-learned.md) に追記して蓄積する運用。記録トリガーに該当したら指示を待たずに追記を提案する。

対象パスが限定されるルール（`front/src/**` 等）は `.claude/rules/` 各ファイルの `globs` を参照する。

## Project Structure & Module Organization

- `front/` is the active app (Next.js App Router, TypeScript, Tailwind). All implementation changes go here.
- `base/` is a reference snapshot and is read-only.
- `docs/` contains requirements, design, and API specs; treat these as the source of truth.
- `tasks/` tracks project task notes.
- Key app paths: `front/src/app/` (routes/layout), `front/src/components/` (UI), `front/src/lib/` (data/auth/helpers), `front/public/` (static assets).

## Build, Test, and Development Commands

Run commands from `front/` unless noted. The project pins pnpm via `packageManager` (`pnpm@10.7.0`); enable it with `corepack enable`.

- `pnpm install`: install dependencies.
- `pnpm dev`: start local dev server.
- `pnpm build`: production build.
- `pnpm start`: run the production server after build.
- `pnpm lint`: run ESLint checks.
- `pnpm test` / `pnpm test:e2e`: unit (Vitest) / E2E (Playwright).

First-time local setup (env vars, Supabase, Prisma) is documented in `docs/09-architecture-specification.md`.

## Coding Style & Naming Conventions

- Language: TypeScript + React (Next.js App Router) with Tailwind CSS.
- Follow existing formatting in `front/`; keep indentation and line wrapping consistent.
- Components use `PascalCase` filenames (e.g., `Modal.tsx`).
- Route files live under `front/src/app/` using Next.js conventions (e.g., `page.tsx`, `layout.tsx`).
- Prefer small, focused helpers in `front/src/lib/`.

## Testing Guidelines

- Unit tests use Vitest + @testing-library/react (`pnpm test`).
- E2E tests use Playwright (`pnpm test:e2e`); first run needs `pnpm exec playwright install`.
- Test strategy and cases: `docs/08-test-specification.md` and `docs/test-design/`.

## Commit & Pull Request Guidelines

- Git history uses short, direct messages (English or Japanese). Keep commit subjects concise and action-oriented.
- Work on a feature branch and merge via PR; avoid direct commits to `main`.
- PRs should include: a clear description, linked issues/tasks if available, and screenshots for UI changes.
- PR 本文の必須セクションは [`.claude/rules/pr-description.md`](./.claude/rules/pr-description.md) が正本。変更種別を冒頭で宣言し、該当なしのセクションも `なし（理由）` と書いて省略しない。テンプレートは `gh pr create --template <種別>.md` で指定する（`.github/PULL_REQUEST_TEMPLATE/` は Web UI では自動選択されない）。

## Security & Configuration Notes

- Supabase Auth and DB setup are handled outside this repo; avoid adding setup scripts without explicit direction.
- Prisma schema should not be edited by hand; use `prisma db pull` if schema updates are required.
- Vercel deploys from `main` and targets `front/` only.
