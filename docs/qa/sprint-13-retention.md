# Sprint 13 retention worker

The retention implementation uses a trusted HTTP worker and an explicitly provisioned Supabase pg_cron/pg_net schedule. SQL alone cannot remove Storage bytes. No migration, Vercel deployment, or user upload activates this scheduler.

## Retention and safety

Photos normally disappear before provider processing. Abandoned pending, failed, completed and confirmed analyses become eligible at their existing `expires_at` (24 hours after initial claim). Current/confirmed analyses before that deadline are never selected. The worker deletes only exact `user_id/analysis_id-attempt.jpg` paths in the private `food-analysis` bucket. It rechecks UUIDs, attempt bounds, expiry and the full expected path before deletion. No caller-supplied batch/path/user parameters are accepted by the HTTP endpoint.

`claim_food_photo_cleanup` uses FOR UPDATE SKIP LOCKED, deterministic ordering and five-minute claim leases. Default endpoint batch is 20, hard RPC maximum 100, concurrency four, eight-second HTTP timeouts and a 35-second dispatch budget. Failed rows become eligible after the lease and rotate behind other due work; a later worker can retry a crash. Missing-object deletion is successful/idempotent. Only successful Storage deletion is acknowledged using the exact owner, path and claim token. Metadata is then marked expired, model result/provider/model/error removed, with minimal metadata and confirmed log IDs retained. Existing Nutrition snapshots are unchanged. Rows already expired with no object are excluded on reruns.

There is no absolute physical-deletion guarantee during infrastructure outages. In healthy operation, the one-minute schedule processes up to 20 rows per tick; backlog and failed leases can extend deletion past 24 hours. Monitor failures and backlog. Access expiry is independent of physical cleanup.

## Operator activation (separate environment approval required)

1. Deploy the branch worker endpoint `/api/internal/food-photo-cleanup`. It rejects unauthenticated requests and defaults closed when `FOOD_PHOTO_CLEANUP_SECRET` is unset. Set a unique server-only random secret of at least 32 characters only in the approved environment. The worker uses that environment's service-role credential; `SUPABASE_URL` can supply a server-only runtime URL override, otherwise the app's configured public URL is used.
2. Store the exact worker URL as Vault `food_photo_cleanup_url` and matching bearer secret as Vault `food_photo_cleanup_secret` in that same Supabase environment. Use a stable deployment/branch URL and HTTPS remotely. Never store the service-role key in cron command text.
3. Manually invoke the endpoint using the secret through secure tooling; only counts are returned. Inspect authentication, deletions, metadata and failure counts.
4. With explicit environment approval, run `scripts/food-photo-cleanup-schedule.sql`. It schedules one tick per minute, using pg_cron/pg_net and reading the bearer from Vault at execution time. This file is deliberately outside migrations and deploy hooks.
5. Disable with `select cron.unschedule(jobid) from cron.job where jobname='tfk-food-photo-cleanup';`. Remove only this worker's Vault credentials when decommissioning.

Supabase scheduling reference: https://supabase.com/docs/guides/functions/schedule-functions
Storage deletion reference: https://supabase.com/docs/guides/storage/management/delete-objects

## Verification

- 12 new rollback DB tests: batch bounds, leasing/overlap, current confirmed protection, stale claim and wrong path rejection, completion, retry and privileges.
- Nine application tests: bearer authorization, malicious paths/rows, missing object idempotency, deletion-before-ack ordering, failure retry and bounds.
- Eight real local Storage retention tests: expired pending and failed objects physically removed, missing object handled, current confirmed preserved, batch limit, rerun, malicious path constraint and victim object preservation.
- Existing 10 real Storage API tests retained.
- `python3 scripts/test-food-photo-cleanup-scheduler.py` starts an isolated local worker on port 3002, configures local pg_cron/pg_net/Vault, waits for a real scheduled tick to delete an expired pending photo, verifies deletion, then disables the cleanup schedule and removes its secret and fixtures. This must only run against local Docker. It does not change the Sprint 12 reminder job.

The existing expiry fixture in food_photo.test.sql now uses transaction-relative time, avoiding a false failure when a slow test transaction crosses a wall-clock second. Applied migrations were not edited. New migration: `20260914175207_sprint_13_food_photo_retention.sql`.

Staging and Production schedules remain disabled/unconfigured. Activation is still required before unattended/live use; implementation and local scheduler testing do not silently activate it remotely. Authenticated Preview photo QA will be performed by the user with their existing staging account; no credentials file is requested or created.

## Recorded fix verification

Local DB/security 474/474; app/shared 209/209; real local retention Storage tests 8/8 plus existing Storage API tests 10/10; actual cron/endpoint checks 2/2. Lint, typecheck, build, diff check and local schema lint pass. The first scheduler test caught a build-time public URL mismatch; the server-only SUPABASE_URL override fixed it, and the full scheduled deletion then passed.

Only the new fix migration was applied to TFH Staging. Staging rollback security 54/54; schema lint clean; all 48 pre-existing data fingerprints unchanged; analyses and food-analysis objects zero after verification. Branch/local inventory 23 migrations; staging 24, including unchanged paused Sprint 10 migration 20260914123542. No history repair/reset. Staging cron.job remains absent. Local cleanup test job was removed after successful execution; Production was untouched.
