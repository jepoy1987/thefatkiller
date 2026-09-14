# Sprint 9 training

## Scope and data model

Web-first training uses the existing `workouts` entitlement (Premium and Coach).
Free users receive an upgrade page, and Training is absent from their navigation.
Mobile, website, Stripe, and the canonical TFK Score are unchanged.

Migration `20260914092848_sprint_9_training.sql` adds nine RLS-enabled tables:
`exercises`, `workout_templates`, `workout_template_items`, `training_programs`,
`training_program_workouts`, `workout_assignments`, `workout_sessions`,
`workout_session_exercises`, and `workout_set_logs`. Ten system exercises form a
small starter library. Custom exercises and templates retain their owners.

Authenticated table access is SELECT-only under RLS. The public invoker RPC
`training_mutate` delegates to a private transactional command that checks the
workout entitlement, derives identity from `auth.uid()`, checks ownership and
relationships, and rejects caller-controlled identities/timestamps. System
exercises cannot be changed through client commands. All commands have explicit
execution grants and an empty search path.

Coach assignments require both the coach role/entitlement and an active
relationship. Client session execution does not transfer template ownership.
Coaches receive only completion/adherence aggregates for their own assignments
within the active relationship; they never receive raw client sessions or sets.
Relationship revocation removes coach access, while clients retain their own
session snapshots. Existing Sprint 8 privacy and scoring behavior is unchanged.

Starting a session snapshots the workout name, ordered exercise names/tracking
and prescribed targets/notes. Completing requires a saved completed set and
updates session and linked assignment together. Repeated completion is idempotent.
Assigned-session history cannot be deleted to falsify assignment completion.

## Web behavior

`/training` provides today's assignments, consistency, recent assignments,
workouts, history and a searchable exercise library. The editor supports ordered
exercises with targets and rest. `/training/sessions/[sessionId]` logs individual
sets, preserves other drafts on save, and blocks completion while drafts are
unsaved. Completed sessions are read-only. Today has a compact Training card;
coach client detail has an assignment form and bounded summary.

Storage is kilograms, meters and seconds. Weight reuses existing kg/lb helpers;
distance uses m/yd. A coach's metric prescription is converted for an imperial
client when displaying snapshots. Summaries use the profile timezone's calendar
days: today through six/29 days ago. Assigned adherence excludes archived and
unscheduled assignments and includes skipped assignments in the denominator.
Training never contributes to TFK Score.

Queries cap the library at 100 matches, templates and assignments at 50, history
at 20, and coach active assignments at 20. History fetches exercise counts, not
sets. Detail batches at most 30 exercises × 100 sets below the API row cap.

## Deliberate first-version limits

- Program schema, validated transactional create/update/delete commands and
  bounded reads are present. Rich program builder and program assignment UX are
  deferred; assign individual workout templates in this sprint.
- No completed-history editing, progression engine, streaks or external exercise
  API. Weight/distance displays use lb/kg and yd/m rather than automatic long
  distance formatting.
- Latest-list caps are explicit in the UI. The initial workout picker uses the
  first 100 library exercises; library filters can search beyond that list.
- Drafts survive normal set saves, not browser reloads or leaving the page.

## Local verification — 2026-09-14

Baseline: `9348bcb323414b3b8b2227c7dc15765a2169d565`.
CLI remains pinned to 2.117.0; local Storage uses v1.72.1. All 17 migrations
apply from reset. The post-QA reset removes temporary local QA identities/data.
The original entitlement test has a global zero-coach assertion, so its clean
baseline run must happen after removing persistent manual-QA fixtures.

Manual browser QA covered local client/coach login, paid navigation, free upgrade
and hidden navigation, workout creation/start, strength (100 lb) and cardio
(600 sec/550 yd) logging, preserved notes drafts, completion, read-only history,
Today assignments, coach creation/assignment, and client completion returning
1/1 (100%) coach adherence. The coach summary excluded the self-directed session.
Custom exercise creation/search and a 390px viewport passed with no horizontal
overflow. Authenticated dashboard, progress, nutrition, check-ins, billing,
GLP-1, coaching, profile settings and training returned 200 without app errors.

QA found and fixed whole-second HTML input validation and React action-metadata
filtering before promotion. An initial local dashboard query error did not recur
on direct-query verification or subsequent browser regression checks; the final
local build produced no runtime errors during the completed checks.

Final local gates: 231/231 DB/security tests (67 new training checks),
119/119 application/shared tests (21 new), schema lint, workspace lint,
typecheck, build and `git diff --check` passed.

Staging `nxppfepdgvevlmthzacc` received only the Sprint 9 migration after local
verification. Migration parity is 17/17, schema lint is clean, and 24 transactional
checks passed using the existing QA coach/client relationship. All QA training
records were rolled back. Local and staging generated types match apart from
PostgREST version metadata. Preview results are recorded in the PR. Production
verification/deployment and Sprint 10 are outside this task. The PR must remain
open and unmerged.

## Sprint 9 verified-finding fixes — 2026-09-14

P1 root cause: the definer command used `NOT (client = uid OR (coach = uid
AND relationship = helper()))`. For self assignments or revoked relationships,
NULL comparisons can make that expression NULL; PL/pgSQL `IF` then skips the
rejection. SELECT RLS did hide the assignment, but cannot authorize a definer
mutation.

Focused migration `20260914111401_sprint_9_assignment_status_authorization.sql`
replaces only that command branch. It derives identity from `auth.uid()`, rejects
all payload keys except `id` and `status`, fails closed, and locks the exact live
relationship through the mutation. All other command branches are unchanged.
The public wrapper remains SECURITY INVOKER, the private transactional command
remains SECURITY DEFINER with an empty search path, anonymous/PUBLIC execution is
revoked, and authenticated table access remains SELECT-only. The server action
uses the authenticated client and a strict `{id,status}` schema; it supplies no
coach identity and the RPC remains the authoritative security boundary.

| Caller | Allowed status changes |
| --- | --- |
| Assigned client with workouts access | assigned → skipped; skipped → assigned |
| Owning coach with coach role, coach_access and exact active relationship | assigned/skipped → archived |
| Paused/ended coach, unrelated user/coach | Rejected |
| Admin | No override; only assigned-client transitions with workouts access |
| Any caller attempting ownership changes or fabricated completion | Rejected |

P2 root cause: the new-set editor key included the next set number. Deleting the
highest saved set changed that key and remounted the unrelated new-set form,
while its dirty marker stayed in the parent. New drafts now use an exercise ID
key, existing sets retain row ID keys, and only the new form's own successful
save resets its inputs. Server results remain authoritative for saved/deleted
rows. Reverting inputs to their saved/default values clears that form's dirty
marker. No router refresh or optimistic row cache was added.

Five React DOM/jsdom regression tests exercise the actual SessionLogger and
ActionForm reconciliation: new draft + highest saved set deletion, saved draft
+ preceding row deletion, reverting real drafts, deleting an edited saved row,
and failed saves. They assert surviving values, no shifted/reappearing deleted
rows across server refreshes, and completion enabled after the preserved draft
is saved. Only server-action transport is mocked.

P3 audited and deferred: the training foundation repeats entitlement resolution
through several independently guarded loaders. Reworking those interfaces or
adding request caching is outside this focused authorization/draft correction.
No global or cross-user cache was introduced.

Verification: clean local baseline 231/231; post-fix 286/286 (55 new assignment
security checks); local public/private schema lint passed. The new tests exposed
the original authorization failure before the fix. Staging received only the new
migration, passed 55/55 rollback-only security checks, has 18/18 migration parity,
and passed public/private schema lint. Fingerprints for users, roles,
subscriptions, relationships, and all nine training tables matched before/after
staging QA (13 components). The reusable fingerprint query is in
`supabase/verification/sprint_9_assignment_fingerprint.sql`.

Application gates passed: lint, typecheck, 124/124 app/shared tests (38 web,
including five draft regressions), full two-app build using local Supabase, and
`git diff --check`. Manual local browser regression saved Set B (10 reps/110 lb),
entered draft A (12 reps/120 lb plus notes) and a separate Set 1 edit, deleted B,
and confirmed both drafts survived. Saving Set 1 triggered another refresh:
B remained absent and A remained dirty. Saving A cleared the warning, reset the
new form, enabled Complete Workout, and completion succeeded.

Client browser skip and restore actions also passed on a temporary local coached
assignment. The active owning coach's archive action was rechecked through the
client-detail UI. Paused, ended, unrelated, missing-role, missing-entitlement,
admin, immutable-field, and unchanged-row cases are covered by the local and
staging security suite.
