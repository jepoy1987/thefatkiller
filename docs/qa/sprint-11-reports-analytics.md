# Sprint 11 — Reports & Analytics

## Audit and isolation

Started from clean main matching origin/main at `b9c5f015f5ec9c708d4e1ef9bf865025326de2be`. Branch: `feature/sprint-11-reports-analytics`. Audited progress, nutrition/water, habits/check-ins, canonical scoring, training, coaching/privacy, GLP-1 isolation, profile units/timezones, navigation, data loaders, RLS and the 18 main migrations. Existing charts use dependency-free SVG, not a chart package; Reports follows that approach.

Sprint 10 remains paused at `174a58c755b539c1101bcd801461e51debac997d`, PR #12 draft/open/unmerged. No Sprint 10 code, types or runtime dependency is included. Its branch and staging objects were not changed. No AI, OpenAI, Stripe, mobile, marketing website, Today dashboard or canonical scorer changes. No Sprint 12 work.

## Architecture and security

Reports are computed on demand from existing source tables. No snapshots, export files, write actions, new tables or source-table policy changes. One additive migration adds two guarded public RPCs and two private helpers. The server-only loader authenticates, resolves advanced_reports through the existing entitlement system, loads authorized timezone context, validates the range, and requests daily aggregates. It does not use a service-role key. Direct RPC access independently enforces the entitlement.

User data is always derived from auth.uid(); a submitted client ID enters the coach authorization path. Coach reports require the actual coach role, current advanced_reports and coach_access entitlements, and an exact active relationship. There is no administrator override. Private helpers are inaccessible to authenticated/anonymous callers. Definer functions use an empty search_path and explicit qualification.

Coach progress, nutrition/hydration and accountability honor the existing three sharing flags, defaulting to withheld when privacy settings are absent. Any missing scoring category suppresses the whole score, including comparisons. Coach training is limited to sessions and assignments attached to that coach's active relationship, matching Sprint 9; it does not expose self-directed training. Existing table RLS stays intact. The client overview links to its Reports route when the viewer has advanced_reports.

GLP-1 fields are never selected, even if journal-summary sharing is enabled. Progress photos, counts, signed/storage URLs, private notes, food/habit/workout names, auth metadata and billing identifiers are excluded from report payloads. Calendar-only context does not disclose source records.

## Periods and analytics

Presets cover 7, 30 and 90 inclusive client-local dates ending today. Custom dates support 1–365 days, start at or after 1900-01-01, start <= end and end <= client-local today. Validation exists in both Zod and SQL. SQL timestamp boundaries use the profile IANA timezone; calendar arithmetic does not assume every day lasts 24 hours. Today is labelled partial.

- **Progress:** period first/last readings, count, neutral signed change and last-reading-per-date trend. Change needs at least two readings. No pre-period reading is carried forward. Storage remains kg; display uses the existing kg/lb conversion.
- **Nutrition:** logged-date calorie/protein/carbohydrate/fat averages, current targets, calories within the existing 85–115% tolerance, and protein reaching the existing 85% threshold. Protein percentage uses logged dates as denominator, stated in the UI. Missing logs do not mean zero actual intake.
- **Hydration:** logged dates, average intake on logged dates, current target, average per-logged-date target credit capped at 100%, and dates reaching the full target. Display uses existing ml/fl-oz conversion. Extra water earns no extra credit.
- **Accountability:** currently active daily habit completions/opportunities and percentage; daily check-in count/percentage; weekly check-ins in the Monday-based weeks overlapping the range; current/end and longest check-in streaks bounded to the range. An unfinished today can continue yesterday's streak. Weekly habits do not become daily opportunities. Weekly check-ins use week_start even when entered later.
- **TFK Score:** the unmodified canonical SQL input and TypeScript calculateTFKScore are reused. The score always describes seven dates ending at the selected period end, even for a 30/90/365-day report. It is explicitly not a report-specific whole-period score. The exact overall value and each existing category are displayed.
- **Training:** non-archived assignments scheduled in the range, their completed count and percentage, sessions started in the range, and workouts completed in the range. Assignment status is evaluated through the selected end; sessions use their own start/completion dates. Elapsed start-to-finish time can include idle time and is not reliable active training duration, so duration and exercise-ranking analytics are deferred.

Availability is typed as available, no_entries, not_applicable or not_shared. Withheld/unavailable metrics stay null. Known no-entry counts may be zero; absent averages, targets, changes and zero-denominator rates stay null. Comparisons for 7/30-day ranges use the previous equal-length range, with neutral signed logged-day/workout/score-point/habit-percentage-point differences. Score comparisons remain canonical seven-day endpoint comparisons.

Current goals and currently active habits apply to historical ranges because the schema does not version targets or habit activation history. Reports are a current reconstruction of recorded events, not an immutable historical snapshot. This limitation is visible in the UI.

## Web, accessibility and performance

/reports and /coach/clients/[clientId]/reports contain Overview, Weight & Progress, Nutrition, Hydration, Accountability and Training. Filters have labels, date constraints, focus styles, clear local-date/timezone labels and server validation feedback. Free accounts get a plan gate and no Reports navigation link. Today stays unchanged.

Five server-rendered charts cover weight, calories, protein, water target credit and workout completion. Each has an accessible label, textual summary and expandable table containing every plotted date/value. Gaps break line segments; no hover or color-only interpretation is required. Desktop and 390px web layouts were inspected; no horizontal page overflow was found.

The report-specific loader uses one entitlement RPC, one authorized context RPC and one report aggregation RPC; existing shell/session requests remain. SQL groups each source at daily grain, with at most 365 output rows (or two periods of at most 30 rows for comparisons). It does not load raw histories in the browser or issue per-day network queries. Existing owner/timestamp and assignment/relationship indexes support the scans. A 365-day local fixture report measured 120,732 JSON bytes and approximately 8.3 ms database execution; this small synthetic-data check is not a production-scale performance guarantee.

The typed report model provides a future sanitized export boundary. CSV/PDF export is deferred; no export route or persistent snapshot was added.

Shared contracts: ReportPeriod, ReportAvailability, ProgressReportSummary, NutritionReportSummary, HydrationReportSummary, AccountabilityReportSummary, TrainingReportSummary, TFKReport and ReportComparison. Strict reportPeriodSchema validates real ISO dates, preset/range consistency, range bounds and client-local future dates. Generated DB types come from local main + Sprint 11 and are checked against staging's new RPC signatures without importing unrelated Sprint 10 types.

## Local verification

- Main baseline clean reset: 18 migrations, 286/286 DB/security tests.
- Final branch clean reset: 19 migrations (main + Sprint 11), 340/340 DB/security tests; public/private schema lint clean.
- New rollback-only report suite: 54 checks covering anon/Free denial, Premium/Coach ownership, arbitrary client IDs, private helper denial, admin/no-role/no-entitlement access, active/paused/ended/unrelated coaching, actual source aggregates, photo RLS, GLP-1/notes exclusion, withholding in current/previous results, canonical input equality and bounded ranges.
- App/shared: 153/153 tests, including 67 web tests (29 new). New coverage includes all periods, invalid/custom ranges, Manila and Chicago DST dates, unit conversion, averages, adherence caps, streaks, comparisons, missing states, canonical scorer equality, server gates and chart text equivalents.
- pnpm lint, pnpm typecheck, pnpm test, full local-config pnpm build and git diff --check passed. A first typecheck encountered stale generated Next.js types from the prior branch; rebuilding removed those generated artifacts without changing Sprint 10 source.
- Authenticated local browser QA passed: all presets, submitted custom range, invalid future range, units, five chart/table pairs, coach assignment-only training, owner privacy toggles followed by coach redaction, unassigned coach 404, Free plan gate, and auth/dashboard/progress/nutrition/check-ins/training/coaching/GLP-1/billing/settings profile smoke checks. No browser errors were reported. Temporary local QA identities/data were removed; the clean full security suite passed afterward.
- Common credential-pattern scan found no matches in tracked/new source. Ignored credentials and temporary QA passwords are not committed; this is a pattern check, not an exhaustive secret-scanner claim.

## Staging migration divergence

Before editing, staging history was audited: all 18 main migrations plus paused Sprint 10 `20260914123542`. Sprint 11 uses a separate CLI-created timestamp: `20260914132112_sprint_11_reports_analytics.sql`.

Promotion used an isolated temporary work directory with the exact main + Sprint 11 migration files and a byte-for-byte copy of the already-applied Sprint 10 migration read from its preserved commit. That copy is only deployment-history inventory, not a Sprint 11 source/runtime dependency. Dry-run proposed only Sprint 11. The CLI then applied only Sprint 11, without resets, history repair, manual migration marking, force flags or changes to Sprint 10.

Expected final history: 19 branch migrations applied plus one intentional remote-only Sprint 10 migration; the combined deployment inventory has 20/20 parity. This divergence is intentional and must remain documented until Sprint 10 is merged or otherwise handled explicitly. Do not run a history repair to hide it.

Staging report security tests passed 54/54 in BEGIN/ROLLBACK. Twenty-four data fingerprints matched across promotion/tests: users, roles, subscriptions, relationships, training tables, report source tables, privacy settings and paused weekly_insights. Staging schema lint and final parity are checked separately. No Production database or deployment verification is involved.

## Delivery status

Feature branch will be pushed and a draft PR opened into main. Automatic Vercel Preview readiness, exact commit, route/runtime health and authenticated QA results are recorded in the delivery addendum. Keep the PR draft/open/unmerged. Production is not configured, verified, deployed or promoted.

Recommended next step after Preview QA: review the deterministic calculation semantics, historical-target limitation, coach privacy and documented branch-specific migration inventory before deciding whether to mark the PR ready for review. Do not merge automatically. Sprint 10 remains paused; Sprint 12 has not started.
