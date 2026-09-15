# Sprint 14 Auth hardening evidence

Status: `AUTH_STAGING_HARDENED`

Audit date: 2026-09-15. Project: TFH Staging (`nxppfepdgvevlmthzacc`).
The initial evidence below was collected read-only; a later explicitly approved
staging-only phase applied and verified the hardening settings. Production,
schedulers and cloud restore remained untouched.

## Applied staging result

- Site URL:
  `https://thefatkiller-web-git-feature-sprint-14-laun-9d09ee-projects-tam.vercel.app`
- Allowed redirects: the exact Sprint 14 `/auth/callback` and
  `/auth/recovery-callback`, both localhost equivalents, and
  `tfk://auth/callback`.
- The two stale Sprint 8 web callbacks were removed only after the Sprint 14
  replacements were verified. No wildcard redirect was added.
- Minimum password length is 12 with lowercase, uppercase, number and symbol
  required. This matches application signup/reset validation; login does not
  force-reset or reject an existing user solely because their current password
  predates the stronger policy.
- Leaked-password protection is enabled. The current dashboard recheck confirms
  both this control and the password policy.
- Auth rate limits were left unchanged because custom SMTP/delivery is not yet
  configured.
- Callback/recovery-marker/open-redirect behavior remains covered by the
  focused automated suite. A real recovery email and native physical-device
  recovery remain manual acceptance items.

No Auth configuration grants roles, subscriptions or Premium access; those
remain database-controlled. No staging reset was performed.

## Pre-change staging URL audit (historical)

The configured Site URL is:

`https://thefatkiller-web-git-feature-sprint-8-coaching-projects-tam.vercel.app`

It is exact (not a wildcard), resolves, returns HTTP 200, and reaches `/login`, so it is navigable. It is nevertheless stale for Sprint 14 and should be replaced with the approved current staging origin. The final origin must be re-read from the successful deployment created by the commit being approved; a guessed Vercel branch alias is not acceptable.

Current exact redirect allow-list and disposition:

| Current entry | Classification | Reason |
| --- | --- | --- |
| `https://thefatkiller-web-git-feature-sprint-8-coaching-projects-tam.vercel.app/auth/callback` | REPLACE | Navigable but tied to the stale Sprint 8 origin. |
| `https://thefatkiller-web-git-feature-sprint-8-coaching-projects-tam.vercel.app/auth/recovery-callback` | REPLACE | Navigable but tied to the stale Sprint 8 origin. |
| `http://localhost:3001/auth/callback` | KEEP | Exact local signup/confirmation callback. |
| `http://localhost:3001/auth/recovery-callback` | KEEP | Exact local password-recovery callback. |
| `tfk://auth/callback` | KEEP | Current mobile forgot-password code references it; native end-to-end handling remains a manual prerequisite. |

No wildcard redirect is configured. After the final local commit is pushed, the approval request must identify the exact successful Sprint 14 Preview origin and propose adding both `<origin>/auth/callback` and `<origin>/auth/recovery-callback` before removing the two Sprint 8 entries. Keep the old hosted callbacks until the replacement is added and QA no longer depends on the old deployment.

## Pre-change remote Auth configuration (historical)

- Signup and email provider: enabled; anonymous signup disabled.
- Email confirmation: required (`mailer_autoconfirm=false`); unverified email sign-in disabled; secure email change enabled.
- OTP: 8 digits, 3,600-second expiry; per-user email cooldown 60 seconds.
- Password minimum: 6 characters.
- Required password characters: none.
- Leaked-password protection: disabled.
- Custom SMTP: not configured.
- CAPTCHA: disabled.
- JWT expiry: 3,600 seconds.
- Refresh-token rotation: enabled; reuse interval 10 seconds.
- Session inactivity timeout, absolute timebox, and single-session enforcement: disabled.

Staging is on Pro, so leaked-password protection and paid session controls are available. Enabling leaked-password protection causes Supabase to reject compromised credentials during password-based signup, sign-in, and password changes/recovery; application error handling remains generic to avoid account disclosure.

## Applied password and retained session policy

The approved staging change set the remote minimum password length to **12**,
required lowercase, uppercase, number and symbol character classes, and enabled
leaked-password protection. Local signup/reset validation and user hints match;
login deliberately remains compatible with existing credentials. No real
personal compromised password was used for verification.

Keep the current one-hour JWT expiry, refresh rotation, and ten-second reuse interval for launch unless product/security owners choose a documented inactivity or absolute session duration. Supabase's default global logout is used. A logout failure no longer silently redirects to login. Remember that access JWTs can remain usable until expiry, so a high-risk forced-revocation workflow would need a separate session-row check; no custom session architecture was added here.

## Rate limits

Observed project values are: email sends 2/hour, OTP 30/5 minutes, verification 30/5 minutes, token endpoint 150/5 minutes, token refresh 150/5 minutes, SMS 30/5 minutes, and anonymous users 30/hour. Supabase's documented password signup/sign-in IP limit is 30 requests per five minutes. Recovery requests are also bounded by the 60-second per-user email cooldown. The built-in email sender explains the restrictive two-emails-per-hour project limit encountered during QA.

Recommendation: do not raise email limits while using the built-in sender. Before launch, approve and verify a custom SMTP provider or Auth Send Email Hook, delivery monitoring, sender/domain configuration, and abuse controls. Only then size the project email limit from provider capacity and expected verified traffic; retain the 60-second per-user cooldown and current IP/verify/token limits initially. Re-evaluate from rate-limit and delivery telemetry rather than increasing values preemptively.

## Recovery, redirects, enumeration, and sessions

The automated suite performs callback/session logic without sending email. It verifies a valid confirmation callback, malicious external redirect rejection, recovery PKCE exchange, the short-lived secure HttpOnly recovery marker, generic expired/invalid recovery handling, blocked reset without the marker, authenticated password update and marker consumption, and Supabase logout invocation. It also checks generic login/signup/reset-provider failures and the identical forgot-password success contract expected for an existing or absent address.

The complete email-provider loop was not run because repeated staging email sends previously exhausted the built-in quota. Manual staging acceptance after remote approval must use disposable accounts and record:

1. Request recovery for one disposable existing address and one absent address; confirm the immediate UI does not distinguish them.
2. Open the existing account's email once; confirm the exact approved origin and `/auth/recovery-callback`, exchange the code, reach `/reset-password`, and reject reuse/expiry.
3. Confirm a direct reset-page visit and a normal confirmation callback cannot grant recovery access.
4. Set a policy-compliant new password, reach the dashboard, log out, confirm a protected route returns to login, reject the old password, and accept the new password.
5. Repeat the native-device flow for `tfk://auth/callback` before claiming mobile recovery ready.

Supabase session cookies are refreshed in middleware via `getUser()`, and protected server operations validate the user remotely through the same method. The recovery-only marker adds HttpOnly, SameSite Lax, Secure-on-HTTPS, ten-minute attributes. The base Supabase SSR library controls its own authentication-cookie attributes; no unsupported custom cookie/session format was introduced.

## Role separation

Auth code contains no role, subscription, entitlement, admin-grant, or service-role mutation. Existing database tests exercise anonymous/authenticated isolation, role-guarded RPCs, coach/client relationships, and plan entitlements. A successful login alone therefore grants none of admin, coach, or Premium.

## Remaining approval boundary

The staging Site URL, redirect replacement, password policy and leaked-password
control are complete. Separate approval is still required to send a real
recovery email, change rate limits, configure custom email delivery, or perform
native physical-device recovery QA. Production configuration remains out of
scope and must use `https://app.thefatkiller.com`, not the Preview origin.
