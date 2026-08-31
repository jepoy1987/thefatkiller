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

## Staging Auth URL configuration

In the staging Supabase Dashboard under **Authentication → URL Configuration**,
set the Site URL to `https://app.thefatkiller.com` when the hosted staging app
is ready. Add these exact redirect URLs:

- `http://localhost:3001/auth/callback`
- `https://app.thefatkiller.com/auth/callback`
- `tfk://auth/callback`

The custom mobile scheme is declared as `tfk` in `apps/mobile/app.json`.
Keep production and staging Auth settings separate. Preview deployment URLs
should be added explicitly when a preview environment exists; do not use a
broad production wildcard by default.

## Database enforcement

Profiles are inserted by a tightly scoped `SECURITY DEFINER` trigger with an empty `search_path`. Function execution is revoked from public client roles. RLS and column-level grants allow authenticated users to select their own profile and update only editable profile columns; IDs and database timestamps cannot be changed by clients.
