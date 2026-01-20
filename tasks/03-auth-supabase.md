# Task 03: Supabase Auth (Google OAuth + allowlist)

## Goal
Enable admin-only create/edit/delete with Google OAuth2 and allowlist.

## Scope
- Configure Google provider in Supabase Auth
- Implement login/logout in UI
- Allowlist a single admin email
- Protect API routes

## Steps
- Configure Google OAuth in Supabase
- Add auth client in `front/`
- Implement login/logout flow
- Read user email and compare with allowlist env (ADMIN_EMAIL)
- Hide admin actions for non-allowlisted users
- Enforce admin check in API routes

## Notes
- Do not rely on UI-only checks
- Use server-side checks for protected routes
