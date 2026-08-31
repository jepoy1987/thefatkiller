# Web-first development

TFK develops new product behavior in `apps/web` first. A feature should reach a
stable, approved web flow before React Native implementation begins.

## Delivery sequence

1. Build the complete web flow using server-side RLS-aware data access.
2. Verify behavior, accessibility, and user acceptance on web.
3. Extract only genuinely portable types, validation, conversion, and business
   rules into shared packages.
4. Design the native interaction after the product behavior is stable.

## Boundaries

- Supabase schema, migrations, RPCs, and RLS are platform-neutral.
- `packages/types`, `packages/validation`, `packages/config`, and
  `packages/scoring` remain portable.
- Next.js redirects, cookies, server actions, and React components remain in
  `apps/web`.
- Mobile imports shared domain contracts but does not mirror web-only
  architecture or UI components.

## Mobile freeze

The Expo app remains buildable and authenticated against the same backend. It
retains profile sync plus the Sprint 2 onboarding and dashboard prototype.
Feature development is temporarily frozen while the web experience matures.
Later native work will focus on daily-use UX, camera, notifications, offline
support, and platform integrations.

## Current database decision

This refactor makes no schema or staging change. Existing security-invoker RPCs
already provide atomic onboarding and goal-setting updates. Profile identity
editing remains separate because canonical kg/cm/ml goal storage is unaffected
by display-name or unit-preference presentation changes.
