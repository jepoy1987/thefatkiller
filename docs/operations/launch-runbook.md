# Launch operations and environment separation

Sprint 14 prepares configuration; it does not authorize Production setup, DNS changes, migration, credentials, schedulers, deployment, or verification.

## Environment contract

| Setting | Local | Preview / staging | Production setup (approval required) |
|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL / ANON_KEY | local Docker | TFH Staging only | new dedicated Production project; never staging |
| SUPABASE_SERVICE_ROLE_KEY | local worker | branch-scoped trusted server worker only | new project key, server-only, explicitly provisioned |
| OPENAI_API_KEY | optional developer secret | approved branch scope | separate budgeted project/key; explicit approval |
| AI_WEEKLY_MODEL | pinned approved model | gpt-5.4-nano-2026-03-17 | approve same pin after setup QA |
| AI_FOOD_MODEL | pinned approved model | gpt-5.4-mini-2026-03-17 | approve same pin after setup QA |
| NEXT_PUBLIC_APP_URL | localhost:3001 | exact Preview URL / allowed branch URL | approved canonical application domain |
| FOOD_PHOTO_CLEANUP_SECRET | generated temporary test secret | disabled until scheduler approval | independently rotated >=32 characters, no public prefix |
| TFK_PERFORMANCE_LOGS | optional metadata-only profiling | temporary branch profiling if needed | disabled unless sampling/log budget approved |
| Future Stripe secrets | test-mode only | test-mode webhook signing secret | live secret and endpoint secret after commercial requirements |

Neither an OpenAI key nor a service-role key may be NEXT_PUBLIC, committed, sent to browser responses, or logged. Provider calls are explicit user actions, not render/prefetch operations. Do not copy staging identities/data to Production as a setup shortcut.

Observed architecture: Vercel project thefatkiller-web, Next.js, apps/web root, Node 24.x, Git main production branch. Existing default region iad1; staging database ap-northeast-1 (Tokyo). The branch requests hnd1 to colocate Preview compute with staging. Before merging/configuring Production, confirm the dedicated Production database region also matches this runtime region, or revise the deployment plan. No current Production deployment settings were changed.

## Dedicated Production Supabase procedure

1. Obtain owner approval for project, organization/plan, region, commercial domain, data residency, RPO/RTO and spend.
2. Create an empty project; record identifiers without credentials. Keep application jobs disabled.
3. Use the reviewed complete migration inventory (26 after Sprint 14) and production-safe catalog seeds only. Never seed QA users, internal Premium grants, photos, coaching data or test insights.
4. Rehearse both zero-to-current and 25-to-26 upgrade locally; compare migration versions and function definitions. Apply forward migrations with the standard CLI; never repair/mark/revert history to make parity appear clean.
5. Configure Auth exact redirect allow-list, email provider, password/recovery protections and approved domain. Enable leaked-password protection before public launch if supported by purchased plan; owner approval is required for the setting change.
6. Configure only the approved environment's credentials; use separate AI spend limits, alerts, and rotation ownership.
7. Back up database AND Storage objects, prove a restore, then perform explicitly authorized Production security/route QA. Release/scheduler activation is a separate decision.

## Background jobs (disabled remotely)

Notification evaluator: public.generate_due_notifications(), bounded users/candidates, per-user locks, rolling cap, dedupe, quiet hours and preference opt-in. Local concurrency/adversarial tests exercise manual/cron overlap. No historical preference backfill. Round-robin throughput at >100 configured users needs a capacity review before activating at scale.

Food cleanup: expired pending/failed photos eligible after 24 hours; Storage API deletion, bounded batches, leases/fencing, expected owner/id/attempt path, idempotent missing-object deletion. Completed/confirmed current objects are not prematurely deleted. Local real pg_cron tick proved deletion; test job/secret were removed. Retention is not an operational guarantee remotely until an approved persistent job runs.

Staging activation procedure, only after separate approval:
- Capture baseline fingerprints and counts. Confirm exact deployed endpoint, migrated versions, feature flags, reminder opt-in population and no queued historical flood.
- Notifications: schedule the reviewed SQL evaluator with pg_cron; start with one explicit run and inspect metadata counts, then an approved cadence. Do not blindly reuse the local job name in another environment.
- Cleanup: provision endpoint URL and independently generated worker secret in Vault; match only that staging Preview/server secret. Run scripts/food-photo-cleanup-schedule.sql only after approval. Never put a bearer value or service-role key in cron.job command text.
- Run a bounded soak; record start/end counts, error counts, leases, deletion success, latency and no residue. On error disable the named job immediately and reconcile outstanding leases before retrying.
- Disable with cron.unschedule(jobid) after verifying the exact named job/environment. Revoke temporary worker secret after soak. Do not disable other projects' jobs.

## Backup and restore

Actual staging/Production paid backup entitlement and a successful restore have NOT been established by this audit. Do not claim backups exist. Supabase docs describe Pro daily backup retention of 7 days; PITR requires applicable paid configuration and retention. Free-tier projects need regular secure exports. Database backups contain Storage metadata, NOT object bytes. Maintain a separate encrypted object backup/inventory and access controls.

Before launch: agree RPO/RTO, responsible operator, off-site encrypted destination, retention, restore cadence and costs. Restore a backup into an isolated project; restore matching Storage bytes; compare counts/checksums and RLS; run owner/coach isolation tests; verify auth recovery and worker configuration without sending notifications or AI requests. Record actual elapsed recovery time. Keep live credentials and jobs disabled in the restored project until deliberate cutover.

## Incident procedures

- **Database failure:** freeze writes/jobs if required; capture incident time; choose verified backup/PITR point; restore to isolated project; reconcile storage and post-backup records; validate before approved cutover. Never restore over live data without explicit authorization.
- **Bad migration:** stop further rollout; snapshot evidence; prefer reviewed forward-fix migration. A Git rollback cannot undo SQL. Do not manipulate migration history. Destructive restoration requires data-loss analysis and owner approval.
- **OpenAI compromise/outage:** revoke affected provider key, disable generation configuration, preserve completed results, rotate only the affected environment. Inspect metadata/costs, not health payloads. No automatic retries; existing explicit retry budgets and leases apply. Manual nutrition remains available.
- **Supabase privileged key compromise:** revoke/rotate supported project keys, disable trusted worker/generation paths, update server-only environment and Vault secrets, redeploy only authorized environments, examine access metadata and verify client bundles do not contain the key. Consider session invalidation separately; key rotation is not assumed to revoke all JWT sessions.
- **Vercel regression:** identify exact known-good deployment and compatible schema. Obtain Production rollback authorization; promote/rollback only that deployment. Check schema compatibility first. This runbook does not execute it.
- **Scheduler failure/flood:** unschedule exact job, revoke HTTP cleanup secret if needed, inspect bounded metadata counters and dedupe/lease state; do not bulk delete user notifications or force-expire current photos.

## Monitoring

Data SDK failures emit fixed operation name, HTTP status and elapsed milliseconds; latest-weight diagnostics emit sanitized provider error code only. No user IDs, query strings, signed URLs, raw health fields or provider payloads. AI logs retain status/model/latency/token metadata only. Cleanup endpoint logs a fixed failure event. Alert routing/retention/on-call ownership is not configured yet and is a launch requirement. Suggested signals: sustained 5xx, elevated auth/RPC failures, provider error/cost spikes, cleanup eligible backlog/oldest age, and missed scheduler ticks. Set thresholds from a controlled soak; do not claim an alert works until delivered and acknowledged.

## Privacy and deletion

Owner health/progress/nutrition/check-ins/GLP-1, photos, private insights and coaching records remain protected by RLS and existing relationship/category-sharing rules. Weekly AI receives allowlisted aggregate activity only, not GLP-1, medications, notes, photos or auth/billing IDs. Photo AI receives the normalized submitted image and returns editable estimates; store:false is used. Current successful photos are deleted; abandoned/failed objects need the scheduled 24-hour cleanup operationally active.

Auth user deletion cascades many database rows, but it does not itself prove private Storage bytes are deleted. There is no complete user-facing account-deletion workflow. This is a launch blocker: implement/approve an operator process that authenticates the request, disables sessions/jobs, enumerates owner-only private object paths, deletes via Storage API, checks relationships/retained shared artifacts, deletes DB/auth data, and verifies residue. Never delete storage.objects metadata directly. Backups/legal retention need an approved policy; this report does not make a legal compliance claim.

## Stripe readiness

Current resolver consumes user_subscriptions and plan_entitlements, with internal/manual providers explicitly distinct from paid checkout. Future Checkout uses authenticated owner and server-selected price IDs. Verify webhook signature on raw bytes; persist event ID uniquely and process transactionally; map only trusted customer/subscription-to-user associations; handle checkout, renewal, cancellation, delinquency and out-of-order delivery. Update user_subscriptions; continue existing resolver/RLS. No major entitlement redesign is indicated, but prices, trials, taxes, refunds, countries and payment terms require decisions before implementation. Internal test grants are not evidence of payment.

## Domains and remaining approvals

Choose a canonical app domain and separate marketing origin after ownership/commercial review; configure exact Auth callbacks and redirects, TLS and redirect policy. Do not change DNS in this sprint. Deployment Protection must be reviewed for QA usability and access restriction; it is not a replacement for app authorization.

Sources: https://supabase.com/docs/guides/platform/backups ; https://supabase.com/docs/guides/auth/password-security ; https://supabase.com/docs/guides/auth/rate-limits ; https://supabase.com/docs/guides/deployment/going-into-prod .
