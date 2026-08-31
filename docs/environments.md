# Environments

This project is prepared for three Supabase environments:

- local
- staging
- production

## Local

Use local credentials in `.env.local` or a local Supabase project. Example values are included in `.env.local.example`.

## Staging

Staging uses Supabase project `nxppfepdgvevlmthzacc` at
`https://nxppfepdgvevlmthzacc.supabase.co`. Store its publishable key in
ignored local environment files and in the staging deployment environment;
never commit it. The web and mobile clients must use this same project.

For local development, the ignored root `.env.local` is exposed to each app
through ignored `apps/web/.env.local` and `apps/mobile/.env.local` symlinks.
Required public variables are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL=http://localhost:3001`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The URL variables must point to the staging URL above, and both clients must
use the same staging publishable key.

## Production

Production uses the live Supabase project for the public website, authenticated app, and mobile app. Never embed service-role secrets in client code.

## Deployment credentials

- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Server-only future usage: `SUPABASE_SERVICE_ROLE_KEY`

Service-role keys may be used only in trusted server workloads or Supabase Edge Functions.

Database passwords and Supabase access tokens are tooling credentials. Keep
them only in ignored local configuration or an approved secret manager; they
must never use a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` name.
