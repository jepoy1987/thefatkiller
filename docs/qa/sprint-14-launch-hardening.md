# Sprint 14 launch hardening

Baseline main: ff9179d06cafc4c5151ebceef4b79bb5b5aa7cc8, clean and equal to origin/main before edits. Branch: feature/sprint-14-launch-hardening. No Production mutation/route/runtime verification, project creation, scheduler activation or merge is authorized by this report.

## Performance evidence

Disposable local mature Premium fixture: 400 weights, 4,800 food logs, 3,200 water logs, 4,000 habit completions, 400 check-ins, 200 workouts/1,000 sets, 2,000 notifications. No existing identities/data or real AI calls. Fixture deleted after each run. Production-mode local Next HTTP requests: one warm-up plus five samples per route. These are complete authenticated HTTP response durations, not browser click/paint or remote Preview timings. Baseline is Next 14.2.15; after includes the security upgrade and loader changes, so individual causality is not isolated.

| Route | Before median ms | After median ms | After SDK reads |
|---|---:|---:|---:|
| /dashboard | 75 | 68 | 19 |
| /progress | 111 | 64 | 13 |
| /nutrition | 66 | 63 | 13 |
| /check-ins | 70 | 66 | 12 |
| /glp1 | 67 | 56 | 9 |
| /training | 75 | 63 | 12 |
| /notifications | 66 | 69 | 7 |
| /reports | 75 | 67 | 7 |
| /insights | 67 | 58 | 7 |
| /coaching | 62 | 54 | 6 |
| /settings/profile | 63 | 56 | 6 |

All measured routes returned 200. Progress improved most (111→64 ms); small route differences are not statistically established gains. Local network does not reproduce the user's 2–3 second remote freeze. Initial project region iad1 versus staging ap-northeast-1 creates cross-region round trips; branch vercel.json requests hnd1. Verify the new deployment region and authenticated navigation before declaring the remote problem resolved.

Navigation initially had no loading/error boundaries; AppShell was rendered after page-loader completion. Now all primary sections have a lightweight streaming skeleton, root transition feedback, modified-click preservation and accessible text status. Two DOM interaction tests verify pending appears before a suspended destination resolves and modified clicks remain native. The sub-150 ms test is DOM/synthetic timing, NOT a measured browser paint SLA. Next Link prefetch remains enabled; loading boundaries let it prefetch shell/fallback rather than all heavy data. No fake delay.

Request-scoped React.cache shares the Supabase client, verified user, entitlement, profile, active goal and coaching navigation by request/client identity. No global authenticated cache, TTL, unstable_cache, shared Map or cross-user cache. A final real local HTTP test interleaved ten requests from two accounts and verified profile isolation (10/10). After HTTP telemetry shows one server-render getUser and one entitlement RPC per route; middleware still independently refreshes/validates session. Dashboard's independent reads were already parallel; request-scoped reuse reduces duplicates. It still has 19 logical SDK reads and its accountability helper loads more than just a score. Remaining aggregation work must be justified by remote measurements, not claimed complete.

Progress history is bounded to 20 entries per page, photos batch-signed once, chart stays latest 12, summary still uses actual earliest/latest dates. Unit regression compares paginated summary to the all-history canonical calculation. Images lazy-decode with stable aspect/dimensions. Food-photo normalization already strips metadata, caps 16M pixels, and outputs <=1600px JPEG. No new chart dependency or broad client conversion. Next shared JS changed from approximately 87 kB to 102 kB with the security upgrade; individual training/settings routes remain larger (~127–129 kB). This is a security/perceived-performance tradeoff, not a bundle-size reduction claim.

### Weight-loading error

Historical Sprint 13 logs contain only generic getLatestWeight failure, without underlying PostgREST code. All mature-account dashboard runs and empty-weight regression passed. Exact historical cause cannot be established from those logs; do not attribute it conclusively to reset timing. Added code-only failure diagnostics and tests for absent weight and database failure. The error remains a follow-up if reproduced; it is not falsely marked fixed.

## Security and reliability

- Next.js 14.2.15 and sharp 0.34.5 had current critical/high advisories. Upgrade to Next 15.5.24, sharp 0.35.4 and React 19.2.4, with async request APIs and adapted React DOM tests. Existing product safety/scoring logic preserved. Patched CSS/build tools as well. Remaining Expo/mobile transitive advisories require a separate mobile dependency upgrade; do not describe the entire repository audit as clean.
- Auth callback backslash redirect escape is now rejected; origin selection accepts only configured app/deployment origins. Seven redirect/origin tests cover malicious destinations and valid internal routing. Password recovery still requires its marker and verified session; new framework async APIs are covered.
- Baseline inventory: 40 public tables, all RLS enabled; 57 public/private application functions inventoried in sprint-14-rpc-inventory.md. Full domain security suite exercises ownership, coach relationship/privacy, Free/Premium, admin and worker boundaries. Authenticated definer RPCs are intentional and require in-function authorization. No blanket privilege grants.
- Staging additionally has Supabase's rls_auto_enable event-trigger function. Advisor labels its grants as RPC exposure; actual return type is event_trigger and ordinary calls are not valid. It is not an application data RPC. No platform-owned trigger change was made. Private worker tables and user_roles intentionally have RLS/no direct read policies.
- A later approved staging-only Auth phase replaced the stale Site URL and exact web callbacks with the Sprint 14 Preview origin, set the 12-character lower/upper/number/symbol policy, and enabled leaked-password protection. Existing rate limits were retained. Production Auth was not changed; native recovery remains physical-device QA.
- Keys remain server-only; signature/current-value scan of all reachable Git history found no matches. This is a scoped scan, not proof against every possible unknown secret format. Service-role operations remain confined to verified server worker paths (AI claim/finish/private Storage cleanup), never generic arbitrary-user browser commands.
- Weekly and food AI retain strict schema, deterministic safety, grounding/section validation, explicit generation, timeout, leases/rate budgets and completed-result reuse. No new paid calls. Prior real-model/Preview acceptance is historical evidence; the framework upgrade still needs authenticated Preview smoke.
- Additive migration 20260915025001_sprint_14_report_rate_limit.sql adds durable per-owner 30/rolling-minute report budget. Clock refreshed after lock, bounded 30 timestamps, fixed-snapshot isolation fails closed, authorization/range checks precede quota. No indexes added without evidence; latest-weight EXPLAIN under RLS returned an indexed limit in ~0.02 ms locally.
- Notifications retain their existing cap, dedupe and manual/cron overlap controls. Food photos retain attempt/day budgets and leases. Auth reset remains provider-rate-limited; CAPTCHA and custom delivery configuration still require launch review. A later lifecycle phase added per-account reservation-backed Storage quotas for progress and temporary food photos without deleting existing objects.
- Mutation pending/disabled feedback exists on important forms. A later lifecycle phase added durable owner-bound request IDs, payload fingerprints and atomic replay receipts for food, saved-meal, water and training start/complete mutations. Local loss-of-response, conflict, expiry, isolation, rollback and concurrency tests passed; this does not deduplicate intentionally distinct requests.
- Root error/not-found UI now explains failure and offers recovery; it warns users to check mutation status before repeating. Data-request diagnostics log operation/status/duration only; no health payload or identity. Alert delivery/on-call integration remains unconfigured.

## Migration and worker verification

Baseline 25 migrations reset cleanly. 25→26 local upgrade and 26-from-zero reset passed. Existing applied migrations untouched, no history repair/revert/mark. New quota table uses auth cascade; remote staging receives only the new migration after local pass. Existing 48-table fingerprints compared around staging work. Legacy entitlement test was corrected to count only its fixture users, because existing staging coach roles must not cause a false failure.

Local: full DB/security 551/551 (including eight new report-budget checks), report concurrency 3/3, notification concurrency 7/7, real Storage 10/10, photo concurrency 3/3, retention 8/8, real scheduler/endpoint 2/2. Cleanup test scheduler and temporary secret removed. No remote scheduler activation. These are short functional concurrency/tick tests, not a multi-day soak. Approved staging soak is still required before retention is operationally guaranteed remotely.

## Operations / launch requirements

See ../operations/launch-runbook.md for environment matrix, Production project procedure, scheduler activation/disable, backups/Storage recovery, credential incidents, provider outage, deployment rollback, privacy, deletion, domains and Stripe integration.

Dedicated Production project is not created; live credentials/jobs/migrations are not configured. Staging daily database backup and local Storage export/restore tooling are verified, while Storage object bytes remain outside database backups. The external encrypted Storage destination is intentionally deferred: hourly Storage RPO, the four-hour recovery target, cloud restore and delivered backup alerts are not proven. The user-facing account-deletion/Storage cleanup implementation is locally verified, but its remote worker cadence and monitoring remain inactive. Stripe commercial terms/prices/webhooks remain future work; the existing entitlement resolver can remain. The canonical Production application origin is `https://app.thefatkiller.com`; its read-only Vercel/DNS/TLS/destination audit and remaining activation steps are recorded in the launch runbook. Do not claim full disaster-recovery or Production launch readiness.

## QA limits and disposition

Automated checks cover all existing feature suites plus 12 hardening and two navigation tests. Accessibility code review covers status labels, reduced-motion skeletons, keyboard native link behavior, focus rings and existing chart text equivalents. Actual 390px/tablet/desktop visual review, screen-reader behavior and Chromium/WebKit/Firefox cross-browser flow must be recorded separately; DOM tests do not prove those.

Authenticated Preview page-load, responsive spot-check and navigation evidence is recorded in the final manual-QA checklist. The AI Food Photo configuration gate is cleared and non-paid file selection is verified; no paid analysis was performed. Complete primary-action, responsive, keyboard/screen-reader and browser matrices remain manual, as do approved paid-provider acceptance tests. No Production verification. This sprint must not be declared READY_FOR_PRODUCTION_SETUP while these and the listed launch prerequisites remain open.

The final authenticated operator matrix and bounded automated preparation
evidence are recorded in [sprint-14-final-manual-qa.md](sprint-14-final-manual-qa.md).

References: https://nextjs.org/docs/14/app/building-your-application/caching ; https://nextjs.org/docs/app/guides/upgrading/version-15 ; https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4 ; https://supabase.com/docs/guides/auth/password-security ; https://supabase.com/docs/guides/platform/backups .

Final local workspace tests: 342/342 (web 256 + shared 86), including 12 hardening and two navigation tests. Final isolated benchmark retained 200 responses on all routes (Progress 62 ms median); type resolution is explicitly isolated from the mobile React 18 workspace. The full staging rollback rerun passed 551/551 after the fixture-scope correction. No Next/React/sharp advisories or web/website dependency paths remained in the final audit; repository-wide Expo/mobile advisories remain (1 critical, 24 high, 9 moderate, 1 low at audit time).
