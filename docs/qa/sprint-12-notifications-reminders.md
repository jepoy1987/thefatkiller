# Sprint 12 — Notifications & Reminders

## Audit and isolation

Started on main `89000fcb247db00c7cff13bbe35fd66c068fa2f4`. Branch `feature/sprint-12-notifications-reminders`. Audited profile timezone validation, existing session helpers/server actions, habit frequencies and completion uniqueness, daily/weekly check-ins, progress timestamps, assignment status/due dates/active coach relationships, GLP-1 entitlement isolation, current effective-plan precedence, app/settings navigation, RLS and migration history. No notification dependencies existed or were added. Source feature tables, auth, billing and canonical scorer behavior are preserved.

Main baseline: 19 migrations and clean local Docker reset, 340/340 database/security tests. Staging baseline: those 19 plus paused Sprint 10 `20260914123542` (20). Sprint 10 code/branch/PR #12 is not changed. No AI, Stripe, mobile, marketing website, email/SMS/push, Production verification/promotion or Sprint 13 work.

## Schema and trusted paths

`public.notifications`: UUID, owner, stable type, title/message, allowlisted internal action URL, JSON metadata, mandatory dedupe key, read/created/expiry timestamps. Unique `(user_id,dedupe_key)`; history and unread indexes. Owner SELECT only. Users cannot insert, delete or modify notification content directly. Narrow authenticated RPCs derive auth.uid() for marking one read/unread and marking all read. No coach/admin relationship grants notification access.

`public.reminder_preferences`: owner PK; category booleans; minute-precision times; selected weigh-in weekdays; weekly weekday; workout lead minutes; quiet hours; updated timestamp. Added explicit habit time and date-only workout fallback time. Profile timezone is canonical, with no duplicate timezone field. Owner-only SELECT/INSERT/UPDATE with both USING/WITH CHECK. Server actions ignore supplied ownership and derive the current authenticated user. Constraints protect direct API writes as well as Zod validation.

No preferences are backfilled and nothing is generated from page rendering. Saving settings explicitly opts a user into evaluation. Defaults: daily/weekly/habit/workout enabled, weigh-in and GLP-1 disabled. Times: weigh-in 08:00, daily 20:00, weekly Sunday 18:00, habits 18:00, workout fallback 09:00 with 60-minute lead, journal 20:00, quiet hours disabled (22:00–07:00 when enabled). Disabled categories still retain valid configurable settings.

## Deterministic evaluator

`private.evaluate_due_reminders(user, at_time)` is a side-effect-free SQL evaluator. Only privileged database operations can supply a user/time. It applies the same effective active/trialing subscription precedence and Free fallback as existing entitlements without depending on Sprint 10. Feature access is checked for each category at evaluation time.

- Daily: local today, configured time reached, no daily check-in.
- Weekly: configured weekday/time reached within the Monday-based local week, no completed current-week check-in. May catch up later in that same week, never backfill a past week.
- Weigh-in: selected local weekday and time, no weigh-in recorded between local midnight and evaluation time.
- Habits: one aggregate reminder for incomplete active habits, excluding future creation and already-completed-today habits. Weekly habits stop when their current calendar-week target is met; targets are capped by the once-per-date model and prorated for creation within the week. A single habit uses its name as plain escaped text; multiple habits show a count. No notes are selected.
- Workouts: assigned status only, owner client, valid active coach relationship when coach-assigned. Due timestamp takes priority; date-only assignments use the saved fallback time in profile timezone. Lead is 0–1,440 minutes. No past-day catch-up, no unrelated-coach information, and no started/completed/skipped/archived assignment reminder. One lifetime reminder per assignment, even after time/lead changes.
- GLP-1: explicit opt-in plus entitlement. Message is exactly **“Remember to update your GLP-1 journal.”** No dose/profile/log records are read, no medication timing is inferred, and no medication action is recommended. This is a time-based journal prompt, not medical advice.

Quiet hours use start-inclusive/end-exclusive intervals, including overnight. No emission while quiet. At the next allowed evaluation, only still-due current-day/week state is considered; past days are not backfilled. Scheduled spring-DST times in a skipped hour become due at the first later local evaluation. Fall repeated hours have the same local dedupe keys. SQL uses IANA profile timezones and separate local-midnight boundaries, not browser timezone or assumed 24-hour local days.

`private.generate_user_reminders` locks that user's preferences row, evaluates, and inserts with ON CONFLICT protection. Daily keys contain local date; weekly keys contain week start; workout keys contain assignment ID. Changing a preference/time does not reissue an existing logical reminder. A rolling 24-hour cap of 20 applies, including across profile-timezone changes and DST. Reminders expire after 48 elapsed hours; expired rows remain in history but do not count as unread/actionable. Dedupe records are retained.

## Scheduler and observability

`public.generate_due_notifications()` is executable only by service_role/the database operator. It accepts no client-supplied user or clock. It runs at most 100 users per batch with a private round-robin cursor and advisory lock. Per-user failures roll back that user's work and increment an error counter without logging source content. Private run history retains the latest 100 runs with timestamp, evaluated users, inserted notifications, duplicates and error counts.

Local pg_cron was available and preloaded. `scripts/notifications-local-cron.sql` is a local-only operator script, never a migration/CI deployment step. A real scheduled run was observed as succeeded during one-minute QA; the schedule was restored to every 15 minutes. After the final clean reset, the 15-minute local job was re-enabled.

**Scheduler enabled: local YES; staging NO; Production NO.** The additive migration does not create an extension or schedule a job. Staging has no cron.job relation. Staging evaluation is tested manually in rollback transactions and on isolated Preview fixtures. At more than 100 configured users, round-robin evaluation latency grows beyond one tick; batching/capacity must be reviewed before enabling scheduling for a larger environment. No external HTTP credential, provider, email or push architecture was added. Coach goal reminders are deferred.

## Web and shared contracts

`/notifications`: latest 100 records with title, message, owner-local timestamp, explicit read/unread/expired state, internal action, mark-one read/unread and mark-all read. Unread-count RPC inspects at most 101 qualifying rows, showing 100+ above the cap. AppShell displays a notification bell/count navigation item. React request cache deduplicates the count lookup when both page and shell use it. No evaluator runs in a render or user mutation.

`/settings/notifications`: labelled Progress, Check-ins, Habits, Training, GLP-1 Journal and Quiet Hours sections; native time inputs, weekday controls, lead bounds, profile timezone, save feedback and clear delivery/quiet-hour semantics. Settings navigation includes Notifications. Today receives no new reminder card. React review covered server-action authentication, request-local caching, parallel independent reads, minimal client props, native controls and text states.

Shared contracts: Notification, NotificationType, ReminderPreferences, ReminderCategory, ReminderEvaluationResult, DueReminder and NotificationChannel (`in_app` only). `reminderPreferencesSchema` validates strict fields, HH:mm, weekdays, lead bounds and quiet-hour consistency; arbitrary timezone/user_id fields are not accepted. Generated new table types and RPC signatures were compared with staging without importing Sprint 10 types. Existing PostgREST metadata is retained.

## Performance and security verification

Habit completions are grouped once for the current week. Workout queries use owner/status and due/date bounds, including a new partial due-time index. No raw habit/workout history is loaded into the UI and no per-habit network lookup is used. Each bounded worker batch uses one evaluator per user, with source predicates/indexes and a maximum of 20 workout candidates.

Local DB/security: **400/400**, including **60 new** deterministic/security checks. Tests cover UTC/Manila/Chicago, skipped/repeated DST hours, quiet-hour boundaries, completed daily/weekly/weigh-in/habit suppression, weekdays, weekly habit targets, inactive/future habits, workout lead/fallback/status/paused coach, GLP-1 wording/entitlement, dedupe/cap, cross-owner access/mutation, arbitrary system insertion, helper/scheduler denial, coach isolation, expiry/badge and trusted worker errors. All fixtures roll back.

App/shared: **175/175**, including 89 web tests (22 new). New app tests exercise defaults, time/weekday/lead/quiet validation, ownership/timezone rejection, form conversion, expiry/count display and bounded/authenticated data paths. Lint, typecheck, full local-config build and git diff --check pass. Local schema lint and security advisors report no issues.

## Local manual QA

Using temporary local client/coach/Free fixtures: authenticated settings opened with safe defaults; saved reminder times/weekday/opt-ins; added incomplete habit/upcoming assigned workout; trusted evaluator generated all six categories; second evaluation inserted zero and reported six duplicates. Browser history showed all six messages, correct action URLs and badge 6. Mark read changed badge to 5, mark unread restored 6, mark all read cleared it to 0. GLP-1 exact wording verified. 390px web screenshot inspected: no horizontal overflow. Browser errors were empty after settled navigation.

Authenticated route smoke returned 200 for dashboard, progress, nutrition, check-ins, training, coaching, reports, GLP-1, billing and profile settings. These complement database/domain regressions; they are not exhaustive end-to-end repetitions of every edit/payment flow. A local plan-loading error occurred while the database was being reset; subsequent settled authenticated checks passed. Final reset removed local QA records and credential JSON was deleted.

## Staging migration strategy and preservation

The migration was initially created by CLI as `20260914142358`. Local reset and tests passed before staging. The CLI refused promotion because paused Sprint 10 is intentionally remote-only. Its repair suggestion was not followed. Instead the Supabase migration API applied only the validated Sprint 12 SQL and recorded version **20260914145145**. The uncommitted local migration filename was aligned to this recorded version; SQL stayed identical; a clean local reset and all 400 tests passed again. No applied history was repaired, renamed, reverted or manually marked. No Sprint 10 file was copied into this branch.

Final inventory: main 19; Sprint 12 branch/local 20; staging 21 (20 branch versions plus paused Sprint 10 `20260914123542`). Both Sprint 10→Sprint 12 and Sprint 12→Sprint 10 DDL orders passed in disposable local schema databases; pg_cron activation was excluded from those clones because it is restricted to its configured database. Scratch databases were removed. Sprint 12 has no Sprint 10 dependency.

Staging notification suite **60/60** passed in BEGIN/ROLLBACK; public/private schema lint clean. All 24 existing fingerprints match the pre-sprint baseline, covering identities, subscriptions, relationships, source data, training, privacy and paused weekly_insights. Post-test new notification/preferences/run tables were empty. Scheduler remains disabled. Preview fixture cleanup/preservation is recorded in the delivery addendum.

## Delivery and follow-up

Push this branch and open a draft PR into main. Verify automatic Preview exact SHA, unauthenticated redirects, authenticated settings/history/read-state and Preview-only error logs. Do not merge automatically. Production verification, Production scheduling, outbound delivery and Sprint 13 remain out of scope.

Remaining release confidence checks: assistive technology/cross-browser time controls, scheduler capacity at realistic population size and explicit staging scheduling activation approval. Scheduler inactivity in staging is intentional and accepted for this sprint; deterministic manual evaluation is available to trusted operators. Sprint 10/PR #12 must still reconcile against newer main and complete real-model QA before any future merge.

References consulted: [Supabase Cron](https://supabase.com/docs/guides/cron), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), Supabase changelog and installed CLI help. Existing Next.js 14 patterns are retained.

## Delivery addendum

Implementation commit: `b15e93e979cb1cd040c03426b3f96d29f2924b5f`.
Draft PR: [#14](https://github.com/jepoy1987/thefatkiller/pull/14), open/unmerged into main.
Implementation [Preview](https://thefatkiller-3q5atc6hy-projects-tam.vercel.app) was READY at the exact implementation SHA (`dpl_6fhqoCnnQ7vzxTs6VgG86dSGAZak`).

Fresh Preview checks: `/login` 200; unauthenticated `/notifications` and `/settings/notifications` 307 to `/login`. Authenticated QA used three isolated synthetic identities, never existing accounts. The client saved settings, a privileged evaluation of only that synthetic user generated all six categories, and the second evaluation reported six duplicates with zero inserts. Notification history showed the exact GLP-1 wording, internal actions and badge six. Read, unread and mark-all changes passed, including explicit waits verifying badge 0→1→0. App actions were allowed to settle before assertions. An initial login navigation raced the auth response; repeating after the redirect settled passed without code changes.

Authenticated Preview regression routes returned 200 for dashboard, progress, nutrition, check-ins, training, coaching, reports, GLP-1, billing and profile settings. 390px screenshot was inspected with no horizontal overflow. Preview deployment-scoped error and 5xx queries returned no entries in the checked one-hour window; browser errors were empty. No Production routes or runtime logs were accessed.

All synthetic Preview identities, assignments, templates and cascading health/reminder data were removed, credential files deleted and the browser closed. Final staging counts: zero notifications, preferences and reminder-run rows; cron.job absent. All 24 original fingerprints exactly match the pre-sprint baseline. Branch inventory matches 20 applied versions plus one intentional remote-only paused Sprint 10 version, for 21 total staging migrations.

Staging security advisors report 19 warnings, distinct from clean schema lint: two expected authenticated SECURITY DEFINER notices for the narrowly guarded notification read-state RPCs, plus existing function-exposure/password-protection notices. The new RPC ownership checks and anonymous restrictions are tested; no broad notification write grant was introduced. Existing `rls_auto_enable` exposure notices and disabled leaked-password protection are recorded for separate platform review; no unrelated permissions or Auth configuration were changed. Local security advisors reported no issues.

Final delivery is ready for a dedicated Sprint 12 pre-merge QA/review pass. Keep PR #14 draft/open/unmerged. Confirm scheduler capacity and consent before any future staging activation; Production scheduling and verification remain deferred. No Sprint 10 reconciliation, AI work or Sprint 13 work was performed.
