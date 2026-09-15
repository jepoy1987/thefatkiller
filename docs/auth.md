# Authentication and profile flow

## Web authentication

The web app uses Supabase PKCE/SSR through `@supabase/ssr`. Signup confirmation uses `/auth/callback`; password recovery uses the separate `/auth/recovery-callback`. Callback origins are derived only from configured application/Vercel origins, and post-authentication `next` values must be same-origin paths. Supabase provider errors are converted to generic user-facing messages rather than exposing account state or provider details.

Middleware refreshes Supabase cookies by calling `auth.getUser()`. Protected server routes and actions also use remotely validated `getUser()` state through `requireUser`; they do not trust `getSession()` as an authorization check. Normal Supabase session cookies retain the library's cookie attributes. The additional `tfk_recovery` capability is HttpOnly, SameSite Lax, Secure on HTTPS, path `/`, and expires after ten minutes. It is issued only after the dedicated callback exchanges a recovery PKCE code, and is consumed after a successful password update.

Logout requires a validated user and uses Supabase's default global sign-out scope. It therefore revokes the user's refresh sessions rather than merely navigating away. Already-issued access JWTs can remain valid until their one-hour expiry; protected application requests still validate the user with Supabase.

## Account creation and passwords

Profiles are created by a database trigger. New signup and recovered passwords are validated locally as at least 12 characters with lowercase, uppercase, number, and symbol characters. Login intentionally requires only a non-empty password so accounts created under an older policy are not rejected by client validation.

Staging's remote Auth password policy must be changed separately, with approval, to match the local creation policy. Leaked-password screening should also be enabled before launch. Until those remote settings are approved and verified, the application-side checks are defense in depth rather than proof of the project-wide policy.

Email confirmation is required. Forgot-password success always says that a link was sent *if the account exists*. Signup, login, callback, recovery-send, and password-update failures do not display raw Supabase messages.

## Mobile authentication

The mobile app uses `@supabase/supabase-js` with Expo Secure Store and `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: false`. The `tfk` custom scheme is declared in `apps/mobile/app.json` and the current forgot-password request targets `tfk://auth/callback`.

The native deep-link exchange/reset UI was not proven in Sprint 14. Keep that exact URL during the remote cleanup because current mobile code references it, but treat mobile confirmation/recovery as a manual launch prerequisite. Do not claim native recovery readiness until a disposable-account device test consumes the code, updates the password, logs out, and logs in again.

## Authorization separation

Authentication establishes identity only. Application roles live in `public.user_roles`; plan access derives from subscriptions and entitlements. Auth actions do not assign admin, coach, or Premium access. Database grants, RLS, and guarded RPCs remain the enforcement boundary.

## URL configuration

Local development requires these exact redirect URLs:

- `http://localhost:3001/auth/callback`
- `http://localhost:3001/auth/recovery-callback`
- `tfk://auth/callback` while the mobile flow references it

Hosted staging requires an exact, navigable HTTPS Site URL plus its exact `/auth/callback` and `/auth/recovery-callback` URLs. Do not use a wildcard Site URL. Preview deployment URLs change after pushes, so the operator must use the active approved deployment or establish a stable staging domain; see `docs/qa/sprint-14-auth-hardening.md` for the audited inventory and approval steps.

## Database enforcement

Profiles are inserted by a tightly scoped `SECURITY DEFINER` trigger with an empty `search_path`. Function execution is revoked from public client roles. RLS and column-level grants allow authenticated users to select their own profile and update only editable profile columns; IDs and database timestamps cannot be changed by clients.
