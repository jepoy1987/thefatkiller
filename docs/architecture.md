# Architecture

## Domain overview

- `thefatkiller.com` hosts the public marketing site.
- `app.thefatkiller.com` hosts the authenticated web app.
- The mobile app uses the same Supabase project and the same user record.

## Web-first delivery strategy

The authenticated Next.js application is the primary product implementation
environment. Feature delivery follows this order:

1. implement the complete feature on web;
2. complete web QA and approve the user flow;
3. stabilize portable domain rules, types, and validation in shared packages;
4. implement the approved daily-use experience in React Native afterward.

Mobile is not abandoned. It remains the cross-platform authentication proof,
the preserved Expo shell, and the future home for camera, notifications,
offline support, native integrations, and focused daily-use UX. Product feature
development is paused at Sprint 2 capability while the web product matures.

## Monorepo layout

The repository uses pnpm workspaces and Turborepo so each application can share types, validation, configuration, and auth helpers without duplicating business contracts.

## Shared packages

- `@tfk/types`: shared domain and profile types.
- `@tfk/validation`: Zod validation for signup, login, profile, and onboarding flows.
- `@tfk/config`: constant configuration and environment defaults that are safe for client code.
- `@tfk/auth`: auth redirect logic and session-state helpers for platform-specific flows.
- `@tfk/api`: portable API contracts and deterministic domain mappers, including
  the platform-neutral Today Dashboard foundation.
- `@tfk/scoring`: reserved for future shared scoring rules; no score exists yet.

Next.js server actions, cookie handling, redirects, web data access, and React
components stay inside `apps/web`. Shared packages contain only domain types,
validation, conversion, and portable business rules.

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

## Authenticated web structure

- `app/`: small App Router entry points and route-specific status messages.
- `components/`: reusable web primitives such as pending submit buttons.
- `features/`: onboarding, goals, dashboard, and profile presentation.
- `lib/data/`: RLS-preserving Supabase reads and RPC wrappers.
- `server/actions/`: authenticated, validated server mutations grouped by domain.

Route components do not assemble raw Supabase records. The dashboard loader
maps profile and goal rows through the shared `mapTodayDashboard` function into
a typed `TodayDashboardData` model. Current progress remains deterministically
zero until future tracking modules are explicitly implemented.

The web goal settings operation remains atomic through the existing
`update_goal_settings` RPC, including unit preference and target updates.
Profile identity settings are intentionally separate because they do not alter
canonical goal measurements. No database migration is required for this
refactor.

## Mobile status

- authentication implemented;
- same Supabase backend and profile synchronization verified;
- Sprint 2 onboarding and Today Dashboard prototype retained;
- new feature implementation paused until corresponding web flows mature.

## Intended deployment structure

- Vercel project for website: `thefatkiller.com`
- Vercel project for app: `app.thefatkiller.com`

This repo is prepared for separate Vercel deployment projects, but actual DNS and deployment credentials remain external to the repo.
