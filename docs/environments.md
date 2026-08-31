# Environments

This project is prepared for three Supabase environments:

- local
- staging
- production

## Local

Use local credentials in `.env.local` or a local Supabase project. Example values are included in `.env.local.example`.

## Staging

Staging should use a separate Supabase project and a distinct anonymous key. Store staging values in the deployment environment and never inside source control.

## Production

Production uses the live Supabase project for the public website, authenticated app, and mobile app. Never embed service-role secrets in client code.

## Deployment credentials

- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Server-only future usage: `SUPABASE_SERVICE_ROLE_KEY`

Service-role keys may be used only in trusted server workloads or Supabase Edge Functions.
