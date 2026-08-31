# Authentication and profile flow

## Web app auth

The web app is configured for the modern Supabase SSR pattern using `@supabase/ssr` and the callback route under `apps/web/app/auth/callback/route.ts`.

This sprint is intentionally focused on the account and onboarding flow, not on advanced permissions or custom claims.

Authorization roles live in `public.user_roles`, separate from `public.profiles`. Authenticated clients receive no grants or policies on the role table, so a normal user cannot elevate themselves while remaining structurally assignable by a trusted administrator in a later sprint.

## Mobile app auth

The mobile app uses `@supabase/supabase-js` with Expo Secure Store for session persistence. Session init must use:

- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: false`

This keeps the auth session stable without repeated flashing or redirect loops.

## Account creation

Profiles are created by a database trigger and do not require manual creation on the frontend.

## Routing rules

- Not authenticated -> `/login`
- Authenticated + onboarding not complete -> `/onboarding`
- Authenticated + onboarding complete -> `/dashboard`

## Password recovery

The `forgot-password` routes are created as the foundation for password reset flows. They are intentionally lightweight while the final email design is deferred.

## Database enforcement

Profiles are inserted by a tightly scoped `SECURITY DEFINER` trigger with an empty `search_path`. Function execution is revoked from public client roles. RLS and column-level grants allow authenticated users to select their own profile and update only editable profile columns; IDs and database timestamps cannot be changed by clients.
