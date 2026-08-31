# Architecture

## Domain overview

- `thefatkiller.com` hosts the public marketing site.
- `app.thefatkiller.com` hosts the authenticated web app.
- The mobile app uses the same Supabase project and the same user record.

## Monorepo layout

The repository uses pnpm workspaces and Turborepo so each application can share types, validation, configuration, and auth helpers without duplicating business contracts.

## Shared packages

- `@tfk/types`: shared domain and profile types.
- `@tfk/validation`: Zod validation for signup, login, profile, and onboarding flows.
- `@tfk/config`: constant configuration and environment defaults that are safe for client code.
- `@tfk/auth`: auth redirect logic and session-state helpers for platform-specific flows.
- `@tfk/api`: minimal API contracts for future server integration.
- `@tfk/scoring`: placeholder package reserved for Sprint 2+.

## Supabase role

Supabase is the source of truth for identity, profile records, and row-level security. The frontend apps only interact with Supabase using public keys; service-role credentials remain server-side only.

## Data flow for Sprint 1

1. User creates an account on the web app.
2. Supabase auth creates the auth user.
3. A database trigger creates the corresponding `public.profiles` row.
4. User completes onboarding.
5. The profile is the shared record used by web and mobile.
6. The same Supabase project powers both clients.

## Sprint 2 goals and measurement storage

`public.user_goals` stores a user's active configuration and daily targets. A
partial unique index enforces one active goal per user, while RLS limits all
reads and writes to `auth.uid()`. The `complete_onboarding` database function
atomically updates the profile and active goal so onboarding cannot complete
with missing target data.

Measurements use a single canonical representation at rest:

- weight: kilograms
- height: centimeters
- water: milliliters

The profile's `unit_system` remains the user's primary preference. Web and
mobile convert values only at their input and display boundaries, avoiding
duplicate converted columns and rounding drift in the database.

## Intended deployment structure

- Vercel project for website: `thefatkiller.com`
- Vercel project for app: `app.thefatkiller.com`

This repo is prepared for separate Vercel deployment projects, but actual DNS and deployment credentials remain external to the repo.
