# Implementation Decisions

## 2026-03-11: DEV-ONLY — Auto-approve new users on signup

**Context:** During development, every new user created via Google OAuth gets `status = 'pending'` in the `handle_new_user()` trigger. This requires manual admin approval before the user can access the platform, which blocks local testing of the full signup → dashboard flow.

**Decision:** Temporarily changed the default status in `handle_new_user()` from `'pending'` to `'approved'` so new users can immediately access the platform after signup.

**Migration file:** `supabase/migrations/dev_auto_approve_users.sql`

**⚠️ MUST REVERT before production deployment.** Change `'approved'` back to `'pending'` in the trigger function so admin vetting is enforced.

---

## 2026-03-11: Use admin (service role) client for signup API routes

**Context:** The broker and buyer signup routes (`/api/signup/broker`, `/api/signup/buyer`) need to insert into `firms` and update `users`. RLS policies block these operations for regular authenticated users.

**Decision:** Use `createAdminClient()` (service role, bypasses RLS) for the firm insert and user profile update during signup. The regular server client is still used for `auth.getUser()` to verify identity from the session cookie.

**Rationale:** Signup is a trusted server-side operation. The user's identity is verified via their auth session, and the server controls exactly what gets written. RLS is not the right enforcement layer here.

---

## 2026-03-11: Consolidated (shared) route group into (auth)

**Context:** The `(shared)` route group contained `/messages` and `/settings` pages accessible to all authenticated roles. The `(auth)` route group contained role-specific pages. Both groups needed the same sidebar layout, but Next.js route group layouts are scoped to their group.

**Decision:** Moved messages and settings from `(shared)` into `(auth)` and eliminated the `(shared)` route group. All authenticated pages now share a single layout with the sidebar navigation.

**Note:** The `/shared/` prefix in `PUBLIC_PREFIXES` (auth-helpers.ts) refers to the public deal sharing route at `(public)/shared/[dealId]/`, not the former `(shared)` route group. It remains unchanged.

---

## 2026-03-11: Middleware allows signup API routes for pending users

**Context:** The middleware was redirecting pending users away from `/api/signup/broker` and `/api/signup/buyer` before the form POST could process, because these API routes were treated as protected routes.

**Decision:** Added `/api/signup/broker` and `/api/signup/buyer` to `SIGNUP_FLOW_ROUTES` in `auth-helpers.ts` so pending users can submit the signup form.
