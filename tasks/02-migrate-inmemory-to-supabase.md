# Task 02: Migrate in-memory data to Supabase

## Goal
Replace in-memory `INITIAL_VIDEOS` with Supabase-backed storage.

## Scope
- Define schema in Supabase or via Prisma migrations
- Create repository/data-access layer
- Implement CRUD via Next.js Route Handlers
- Update UI to fetch from API

## Steps
- Add Prisma schema under `front/` and connect to Supabase
- Create migrations for `video_entries`
- Implement `GET /api/videos` and `GET /api/videos/:id`
- Implement `POST /api/videos`, `PATCH /api/videos/:id`, `DELETE /api/videos/:id`
- Replace `useState(INITIAL_VIDEOS)` with API fetch + state

## Notes
- Keep UI structure identical
- Preserve sorting options (added / published / rating)
