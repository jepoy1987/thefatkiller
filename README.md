# The Fat Killer (TFK)

This repository contains the completed Sprint 0-2 foundation for TFK: the monorepo, marketing site, authenticated web product, stable Expo shell, Supabase schema/RLS, onboarding, goals, and Today Dashboard foundation.

New product functionality is developed web-first. The Expo application remains
supported and buildable, with native feature work following approved web flows.
See `docs/web-first-development.md` for delivery boundaries.

## Project structure

```text
TFK/
├── apps/
│   ├── website/
│   ├── web/
│   └── mobile/
├── packages/
│   ├── types/
│   ├── validation/
│   ├── config/
│   ├── auth/
│   ├── api/
│   └── scoring/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── tests/
│   └── seed.sql
├── docs/
├── .env.example
├── .env.local.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI (for local migration and type generation)
- Expo and Android/iOS tooling if you want to run the mobile app locally

## Install

```bash
pnpm install
```

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Generate database types

This repository expects a Supabase project configured with a project ID:

```bash
SUPABASE_PROJECT_ID=your-project-id pnpm db:types
```

The generated file is stored in `packages/types/src/database.ts` and should be reviewed as the canonical database type contract.

## Hosting plan

- Marketing site: thefatkiller.com
- Web app: app.thefatkiller.com
- Future apps: coach.thefatkiller.com and admin.thefatkiller.com

## Important

Current scope intentionally omits tracking logs, workouts, coaching,
subscriptions, TFK Score, and other future product modules. The repository is
prepared for those modules, but none are started by this refactor.
