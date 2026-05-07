# AGENTS.md

## Commands
- Use npm; `package-lock.json` is the lockfile and Docker uses `npm ci`.
- Dev server: `npm run dev` on `http://localhost:3000`.
- Build: `npm run build`; `next.config.mjs` sets `output: "standalone"` for Docker.
- Lint: `npm run lint`.
- Typecheck: no npm script exists; run `npx tsc --noEmit`.
- Unit/component tests: `npm test`; focused test: `npx vitest run src/path/to/file.test.tsx`.
- Vitest extras: `npm run test:watch`, `npm run test:coverage`, `npm run test:ui`.
- E2E: `npm run test:e2e`; Playwright starts `npm run dev`, targets `http://localhost:3000`, uses Chromium only, and reads specs from `src/__tests__/e2e`.

## App Shape
- Single Next.js 14 App Router app, not a workspace; source lives in `src`, and `@/*` maps to `src/*`.
- Route groups matter: `(public)` contains marketing/login/signup/pending/public shared-deal pages, `(auth)` contains the approved-user sidebar shell, and `(admin)/admin` is the admin page.
- API routes live under `src/app/api`; request validation is centralized in `src/lib/validators.ts`.
- Domain constants and manually maintained schema types are duplicated in `src/lib/constants.ts` and `src/types/index.ts`; DB CHECK values live in Supabase migrations, so keep these in sync.

## Auth And Supabase
- Copy `.env.local.example` to `.env.local`; Supabase URL, anon key, service role key, and `NEXT_PUBLIC_APP_URL` are the meaningful env vars in source.
- Supabase clients are split by trust boundary: browser anon client in `src/lib/supabase/client.ts`, cookie-aware server client in `src/lib/supabase/server.ts`, service-role RLS bypass in `src/lib/supabase/admin.ts`.
- Google OAuth is the only auth flow; tests assert there is no email/password login.
- Route protection is centralized in `src/lib/auth-helpers.ts` plus `src/middleware.ts`; signup pages and `/api/signup/*` are protected routes but must stay in `SIGNUP_FLOW_ROUTES` so pending users can complete onboarding.
- `PUBLIC_PREFIXES` includes `/shared/` for `(public)/shared/[dealId]`; it is not an obsolete shared route group.
- Signup API routes verify the session with the regular server client, then use `createAdminClient()` to create firms and update users because RLS blocks those writes.
- Development auto-approval is intentional but unsafe for production: `supabase/migrations/dev_auto_approve_users.sql` and signup routes set new users to `approved`; revert to `pending` before production deployment.

## Data And Storage
- Supabase migrations live in `supabase/migrations`; `combined.sql` is a destructive v1-to-v2 reset script for the SQL editor, not a normal incremental migration.
- Storage buckets are `deal-documents`, `message-attachments`, `buyer-documents`, `signed-ndas`, and `dispute-documents`; validators and migrations constrain uploads to PDFs up to 50 MB.
- Matching rules exist in both `src/lib/matching.ts` and the SQL `match_deals_to_project` function in `00007_storage_and_functions.sql`; update both when matching changes.
- `src/lib/notifications.ts` only logs placeholder messages; `RESEND_API_KEY` is present in the env example but no email provider is wired in current source.

## Tests
- Vitest uses jsdom, `src/test-setup.ts`, and only includes `src/**/*.test.{ts,tsx}`; it excludes `src/__tests__/e2e`.
- Many tests under `src/__tests__` are static inspections of source files, route strings, required directories, and migration SQL; route or schema renames usually require test updates too.

## UI Conventions
- Tailwind scans only `src/**/*.{js,ts,jsx,tsx,mdx}`.
- Prefer the CSS-variable Tailwind tokens from `tailwind.config.ts` and `globals.css` (`bg`, `surface`, `text`, `primary`, `secondary`, `bg-alt`, `surface-alt`) over hard-coded colors; legacy `navy`, `slate-blue`, `light-gray`, and `text-primary` are marked for phase-out.
- Root fonts are `Outfit` as `font-body` and `Cormorant Garamond` as `font-display` via `next/font/google`.
