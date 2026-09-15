# Sprint 10 reconciliation with Sprints 11–13

Status: implementation and local real-model QA complete; authenticated Preview QA and dedicated final adversarial review remain required. Do not merge.

## Audit and reconciliation

Original branch/remote: `174a58c755b539c1101bcd801461e51debac997d`, PR #12 open/draft. Existing commits: `aa57067` implementation and `174a58c` verification documentation. Backup branch `backup/sprint-10-before-reconciliation-174a58c` preserves that state.

Current main: `e406c6e72a141339000848dee3bc48b820c618a7`, matching origin/main. Normal merge `50d3d0a` brought main into the original feature branch without rewriting history.

Six source conflicts were inventoried before resolution. All were category C (integrate both): environment example, billing feature list, app-shell navigation, database types, type exports, validation schemas. Insights coexist with Reports, Notifications and Food Photo. Database declarations retain every table/RPC; current-main schemas and canonical scorer remain intact. The obsolete unrestricted weekly narrative was subsequently replaced by a stricter grounded selection contract (category D architecture update).

## Migration preservation

Before: main 24, paused Sprint 10 branch 19, staging 25. Reconciled branch/local 25; staging 25. Original `20260914123542_sprint_10_weekly_insights.sql` is byte-identical to the paused branch and appears exactly once. Local/staging `md5(statements::text)` both equal `fe5640bf8c6c27fe144f5407b361b6cd`.

Clean local reset applied Sprint 10, then Sprint 11, Sprint 12 and Sprint 13 in order. Full tests passed. No additional migration, timestamp change, history repair, marking, reset of staging or reapplication to staging was performed.

## Architecture, model and boundaries

Providers remain separate and server-only. A minimal shared deterministic health-text validator was extracted from Sprint 13; its existing 33 safety cases still pass. Weekly output now passes strict schema validation, shared text safety, exact evidence/category validation, then persistence. All display fields are checked. Rejected responses persist only a fixed error code with null result and metadata-only logs.

Every evidence/reason copies a deterministic fact. Headline/summary and category titles must match supplied neutral application-owned text; arbitrary numerical-free claims cannot bypass grounding. Focus actions use existing approved titles. Data gaps must match exactly. Provider JSON schema now mirrors server cardinality (wins/watch at most four, focus one to three) and allowed titles. This corrected two safely rejected real responses, without relaxing server acceptance.

Selected `gpt-5.4-nano-2026-03-17` through server-side AI_WEEKLY_MODEL. Official docs confirm Responses/structured outputs and $0.20 input/$1.25 output per million text tokens: https://developers.openai.com/api/docs/models/gpt-5.4-nano . Its constrained fact selection fits a smaller model; food-photo model was not automatically reused.

Weekly worker uses service-role only for claim/finalize RPCs, which ordinary clients cannot execute. No direct health-source table reads occur through this worker. The source RPC uses authenticated owner identity. Service-role availability in Preview is necessary for this existing architecture; granting authenticated clients these writes would permit forged snapshots/results.

Input remains seven client-local dates ending today, explicitly partial. UTC, Manila, Chicago spring/fall DST pass. Source allowlists deterministic counts for progress, nutrition, hydration, habits/check-ins, workouts and visible goals in active coaching relationships. Current canonical calculateTFKScore is shared by Dashboard, Reports, Coaching and Insights. Reports use their selected report-end window; weekly insights always end today. No alternate scorer was introduced.

GLP-1, private notes, notifications, food-photo raw analysis/images, billing/auth metadata and source food names are excluded. Confirmed food-photo nutrition snapshots flow through ordinary food_logs. Missing data remains distinguished from unavailable categories and zero recorded activity.

## Real local QA

No local users existed before the requested clean reset. A temporary synthetic Premium fixture supplied two weigh-ins, four nutrition-log days, five water-log days and three check-in days. No real person's health data was sent. Fixture removed after each attempt.

Three real calls total: two safely rejected contract mismatches, followed by one successful call. Successful latency 3732 ms, total tokens 1966. Successful row persisted, repeated generation/reload reused its ID, provider calls for that successful fixture remained one, and no duplicate row appeared.

Manual review of successful synthetic output:
- Headline and summary: neutral application-owned framing; partial-day warning supported.
- Wins: two weigh-ins; protein target on four logged days; water target on five days; check-ins on three days — SUPPORTED.
- Watch items: score 44/100; four nutrition days; five water days; zero of two overlapping weeks checked in — SUPPORTED.
- Focus reasons: exact recorded facts — SUPPORTED. Existing neutral logging actions — PLAUSIBLE_NONFACTUAL_GUIDANCE.
- All five data gaps match snapshot availability/completeness — SUPPORTED.
- UNSUPPORTED: zero. OVERSTATED: zero. No medication/GLP-1/diagnosis/causal health advice, shame, restriction, or rapid-weight-loss praise.

The deterministic safety policy is conservative and bounded; exact output choices/facts further constrain weekly output. A single successful sample does not establish broad model reliability.

## Verification

- App/shared 296/296 (web 210; shared 86).
- Weekly suite 54/54, including safety attacks in every output field, all nine category grounding attacks, narrative attacks, retry/idempotency and provider-schema contract.
- Local DB/security 543/543 after clean reset; weekly security 56 included.
- Staging rollback weekly security 56/56; local/staging schema lint clean.
- Food Photo Storage 10/10, concurrency 3/3, retention 8/8; food safety 33/33 retained.
- Eight actual overlapping local weekly requests: one stub call, one row, stable reused ID. No extra paid call.
- Lint/typecheck/test/build/diff passed. Existing automated feature regression covers auth, dashboard, progress, nutrition, check-ins, training, coaching, reports, notifications, GLP-1 and billing/settings to the suites' coverage.
- All 48 staging fingerprints unchanged across rollback tests; no temporary staging fixtures. No scheduling changes.

Preview variables are branch-scoped only: OPENAI_API_KEY, AI_WEEKLY_MODEL and required worker SUPABASE_SERVICE_ROLE_KEY. No Production environment changes, Production verification, merge, new sprint or separate hardening work.

Authenticated Preview generation/history/detail/Today-card verification and a dedicated final adversarial decision remain pending. PR #12 stays draft until those pass.
