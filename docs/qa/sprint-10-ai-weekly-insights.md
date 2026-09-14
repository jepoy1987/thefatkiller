# Sprint 10 — AI Weekly Insights

Implementation and mocked QA are complete; real-model QA and authenticated Preview generation remain pending. Keep the PR draft and unmerged.

## Audit and scope

Started from clean main matching origin/main at `b9c5f015f5ec9c708d4e1ef9bf865025326de2be`, after Sprint 9. Work branch: `feature/sprint-10-ai-weekly-insights`. Audited canonical scoring and its privacy-aware SQL input, progress, food/water logs, habits and check-ins, training, active coaching relationships, GLP-1 privacy, effective entitlements, Today/navigation, environment handling, RLS and all 18 existing migrations. No existing OpenAI provider was present.

Only apps/web and relevant shared types/validation/database code changed. apps/mobile, apps/website, Stripe implementation and packages/scoring are unchanged. No previous migration was edited. Sprint 11 was not started.

## Data model, ownership and entitlement

Migration `20260914123542_sprint_10_weekly_insights.sql` adds weekly_insights with owner UUID, seven-date period, timezone, pending/completed/failed status, model, prompt version, sanitized input snapshot, structured result, summary text, safe error code, generation/create/update timestamps, fenced attempt number and retry time. Constraints bound JSON/text size, enforce completed-result consistency, and uniquely identify user/period/version. An owner/recent-period index supports bounded history.

Authenticated users have SELECT only through owner RLS. Anonymous access and direct client writes are denied. Coach relationships and admin roles grant no access to another person's insights. Owners retain database read access to existing records after entitlement loss; the product routes require the current ai_insights entitlement. Free is blocked; Premium and Coach can generate for themselves using existing effective subscription/feature resolution. UI code does not check plan names.

The owner source RPC derives identity from auth.uid(). Source reads use the authenticated client. Claim/finalize RPC execution is restricted to service_role: allowing authenticated callers to supply snapshots or claimed AI output would permit forgery. A single server-only module isolates the worker credential and receives the identity derived by the authenticated server action. The worker needs RPC execution only; no direct table read is required. Definer functions use an empty search_path; arbitrary-user private helpers cannot be called by clients.

## Deterministic boundary and canonical score

The rolling window is exactly seven client-local calendar dates ending today, inclusive. Today is explicitly partial. The payload records start, end, timezone, as-of time, unit system and goal type. SQL computes timestamp boundaries using the IANA timezone; Manila and Chicago spring/fall DST are tested.

One bounded aggregation RPC supplies structured counts and selected scalar values. There is no browser aggregation or unbounded history transfer. Input covers starting/latest weight, first-to-last period weight change when at least two weigh-ins exist, weigh-in count, nutrition logged days, calorie/protein/water target adherence, daily habits and check-ins, overlapping weekly check-ins, training assignments/completions/completed days, and visible goals in active coaching relationships. Latest historical weight is a single indexed lookup; current starting weight comes from the active goal. Weight values use the profile unit system.

Category availability is explicit and unavailable categories are null, never zero. No entries is distinguished from unavailable access; unlogged nutrition and water do not establish actual intake. Habit rates are null without eligible opportunities. Weekly check-ins count the one or two Monday-based weeks intersecting the window. Training distinguishes scheduled assignment completion from all completed sessions, including self-directed workouts.

Canonical SQL accountability_score_input and calculateTFKScore are reused unchanged. The input carries the existing score and breakdown; AI cannot calculate or modify the score. Displayed full protein-target adherence differs intentionally from the canonical scorer's existing threshold; the methodology explains this without changing the scorer.

GLP-1 is excluded entirely: there is no existing explicit AI-sharing setting. No medication/dose/symptom data, private coach notes, free-text check-in/progress notes, food/workout/habit names, photo URLs, auth metadata, provider IDs or billing IDs enter the payload. The source parser projects known fields and the final input schema rejects extra fields. Each generation requires explicit consent to send the displayed structured summary to OpenAI.

## Provider, safety and persistence

A dedicated server transport calls OpenAI Responses with strict JSON-schema output, store:false, a 2,200 output-token cap and a 25-second abort timeout. UI and loaders never call it. Configuration requires server-only OPENAI_API_KEY and an explicitly approved AI_WEEKLY_MODEL; no model is guessed. The isolated worker also requires server-only SUPABASE_SERVICE_ROLE_KEY. Only blank examples were added; no secrets or remote environment configuration were changed.

The versioned `tfk-weekly-v1` system prompt requires supplied facts only, uncertainty for incomplete data, neutral weight language and no moral judgments. It prohibits diagnosis, prescriptions, medication/dose changes, causal health claims, invented data, shaming, extreme restriction, compensatory exercise and praise of rapid weight loss.

Structured output contains headline, summary, wins, watch_items, next_week_focus and data_gaps. Every evidence/reason must exactly match a deterministic fact in the same category. Focus titles are selected from safe existing-goal actions; gaps must match computed gaps. Zod rejects unknown keys, missing fields, oversized strings/arrays, markup and malformed output. Additional text screening rejects unsafe language and invented numbers in narrative prose. These checks are defense in depth, not proof of semantic safety; live narrative review remains required.

The explicit server action authenticates and gates access, rejects arbitrary submitted fields/IDs, computes and validates input, reuses a completed row, then invokes generation. A per-user transaction lock plus unique key prevents duplicate claims. Completed snapshots are immutable. New periods are limited to one per 24 hours; each period permits at most three attempts, five minutes apart. Pending leases are recoverable and attempt fencing prevents late responses overwriting retries. No regeneration/version UI, cron, automatic dashboard/render/build generation or billing metering was added.

Provider errors/refusals/malformed or unsafe output produce failed status with a bounded safe code, without raw error bodies. Persistence failures leave a recoverable pending lease. Missing configuration is caught before claiming or calling the provider, with a safe UI message. Logs contain only insight ID, model, prompt version, status, latency and token count; no health payload, prompt or secrets.

Provider contract reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Web experience and shared contracts

/insights renders the selected period, deterministic facts, score/breakdown, methodology and gaps, explicit generation consent/action, pending/failure/cooldown state, and structured result. History is capped at the latest ten periods. /insights/[insightId] loads only the owner's saved snapshot/result. The Today card shows the latest completed period/headline and an Open action, or a ready-to-generate state. Navigation uses ai_insights entitlement. Billing's future-feature list now recognizes insights as implemented; no Stripe behavior changed.

Shared types include WeeklyInsightInput, WeeklyInsightDataAvailability, WeeklyInsight, WeeklyInsightStatus, WeeklyInsightResult, WeeklyInsightWin, WeeklyInsightWatchItem and WeeklyInsightFocusItem. Strict weeklyInsightInputSchema and weeklyInsightOutputSchema are exported. Database types were refreshed from staging after the migration.

## Verification

- Baseline: existing 18 migrations reset successfully; 286/286 DB/security checks passed.
- Final local: clean Docker reset with 19 migrations; public/private schema lint clean; 342/342 DB/security checks (56 new).
- Application/shared: 155/155 tests, including 69 web tests (31 new). Timezone/DST, aggregation, canonical score equality, availability, sensitive-field exclusion, safety/prompt contract, malformed/refused output, provider failures, retry/fencing, idempotency, persistence failure and explicit-only generation are covered with mocks.
- pnpm lint, pnpm typecheck, pnpm test, full pnpm build and git diff --check passed. Build uses local Supabase configuration and makes no model request.
- Local authenticated browser: Premium saved insight, history detail, Today headline, Coach own generation form, explicit consent and missing-config message, coach-to-client detail 404, Free plan gate and absent nav item passed. Desktop and 390px rendering inspected; no horizontal page overflow. Auth/dashboard/progress/nutrition/check-ins/training/coaching/GLP-1/billing/settings profile route checks passed. The existing Settings destination is /settings/profile; /settings itself has no route.
- Real local database plus actual generation core and a clearly labelled mock provider persisted snapshot/result and returned the same ID on a second request with exactly one mock call. No OpenAI request occurred. Temporary local browser identities and their data were removed afterward.
- Staging received only the new Sprint 10 migration after local checks. No staging reset. Parity is 19/19 and public/private lint is clean. New security checks run in BEGIN/ROLLBACK. Existing 13 data fingerprints matched across migration; 14 components including weekly_insights are compared across rollback QA.
- The first staging test run exposed an assertion assuming service_role direct SELECT, which local default grants allowed. The worker RPCs already succeeded. Assertions now inspect through owner RLS, retaining narrower staging privileges. No additional grants or schema changes were needed.
- A local full-suite rerun with temporary browser fixtures present hit the pre-existing global coach-role-count assumption; cleanup restored the clean test baseline. The insight suite itself passed. Final suite results are from the cleaned database.
- Common secret-pattern scan of tracked/new source found no credentials; only blank environment examples are tracked. This is a source-pattern check, not a claim of exhaustive secret-scanner coverage.

## Pending QA and next step

OPENAI_API_KEY and approved AI_WEEKLY_MODEL were unavailable, and no local worker service credential was configured in app env. Real-model QA is pending, not passed. Preview authenticated end-to-end generation also remains pending until approved Preview-scoped configuration and a test identity are available. Mocks validate the mechanics, not actual model narrative quality. Review rejection rates, factual grounding, medical/weight/nutrition language and failure recovery with the approved model before review-ready status.

Recommended next step: supply the approved model and local/Preview-only credentials securely, perform one real local test generation and authenticated Preview QA (including saved reload reuse, safety and ownership), then reassess readiness. Keep the PR draft and unmerged until those checks pass.

Production was NOT configured, verified, manually deployed or promoted. Sprint 11 was NOT started.

## Delivery evidence

Implementation commit: `aa57067fbdc982425a9ca6cb7211935dfb9e8947`.
Draft PR: [#12](https://github.com/jepoy1987/thefatkiller/pull/12), open and unmerged.
The subsequent documentation commit records this deployment evidence; its SHA is available in branch history.

Automatic Git Preview for the implementation commit: [thefatkiller-mxf1q6xud-projects-tam.vercel.app](https://thefatkiller-mxf1q6xud-projects-tam.vercel.app), deployment `dpl_BoE4GscBFxQBHRMmz99mJyA3nQyq`, target Preview, READY. Login, signup and forgot-password returned 200. Eleven protected routes, including Insights and detail, redirected 307 to /login without authentication. Deployment-scoped Preview error and 5xx queries returned no entries during the smoke check. This is unauthenticated runtime smoke coverage, not authenticated model QA. No manual deployment or promotion was performed.
