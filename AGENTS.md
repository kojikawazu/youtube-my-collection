# Repository Guidelines

## Project Structure & Module Organization
- `front/` is the active app (Next.js App Router, TypeScript, Tailwind). All implementation changes go here.
- `base/` is a reference snapshot and is read-only.
- `docs/` contains requirements, design, and API specs; treat these as the source of truth.
- `tasks/` tracks project task notes.
- Key app paths: `front/src/app/` (routes/layout), `front/src/components/` (UI), `front/src/lib/` (data/auth/helpers), `front/public/` (static assets).

## Build, Test, and Development Commands
Run commands from `front/` unless noted.
- `npm install`: install dependencies.
- `npm run dev`: start local dev server.
- `npm run build`: production build.
- `npm run start`: run the production server after build.
- `npm run lint`: run ESLint checks.

## Coding Style & Naming Conventions
- Language: TypeScript + React (Next.js App Router) with Tailwind CSS.
- Follow existing formatting in `front/`; keep indentation and line wrapping consistent.
- Components use `PascalCase` filenames (e.g., `Modal.tsx`).
- Route files live under `front/src/app/` using Next.js conventions (e.g., `page.tsx`, `layout.tsx`).
- Prefer small, focused helpers in `front/src/lib/`.

## Testing Guidelines
- E2E testing is expected to use Playwright.
- No unit test setup is currently documented; if adding tests, wire Playwright and document the command in this file.

## Commit & Pull Request Guidelines
- Git history uses short, direct messages (English or Japanese). Keep commit subjects concise and action-oriented.
- Work on a feature branch and merge via PR; avoid direct commits to `main`.
- PRs should include: a clear description, linked issues/tasks if available, and screenshots for UI changes.

## Security & Configuration Notes
- Supabase Auth and DB setup are handled outside this repo; avoid adding setup scripts without explicit direction.
- Prisma schema should not be edited by hand; use `prisma db pull` if schema updates are required.
- Vercel deploys from `main` and targets `front/` only.
