# Launch operations and environment separation

Sprint 14 prepares and verifies launch controls in explicitly approved
non-Production scopes. It does not authorize Production setup, DNS changes,
Production migrations or credentials, scheduler activation, deployment
promotion, or merge.

## Owner-accepted deferred launch risks

The owner accepted the authenticated Sprint 14 application QA on 2026-09-15
and confirmed the original navigation delay is materially resolved. The items
below do not block the PR #16 code merge, but remain Production risks or
prerequisites and must not be described as complete:

- external encrypted Storage backup destination;
- hourly Storage backup execution;
- proven four-hour recovery target;
- cloud restore rehearsal;
- alert destination and delivery testing;
- independent monitoring;
- Firefox testing;
- an exhaustive screen-reader matrix; and
- native mobile recovery on a physical device.

Before real-user activation, complete these items or obtain an explicit launch
risk acceptance for each still-open item. This acceptance does not authorize a
Production mutation, scheduler activation, deployment promotion or merge.

## Environment contract

| Setting | Local | Preview / staging | Production setup (approval required) |
|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL / ANON_KEY | local Docker | TFH Staging only | new dedicated Production project; never staging |
| SUPABASE_SERVICE_ROLE_KEY | local worker | branch-scoped trusted server worker only | new project key, server-only, explicitly provisioned |
| OPENAI_API_KEY | optional developer secret | approved branch scope | separate budgeted project/key; explicit approval |
| AI_WEEKLY_MODEL | pinned approved model | gpt-5.4-nano-2026-03-17 | approve same pin after setup QA |
| AI_FOOD_MODEL | pinned approved model | gpt-5.4-mini-2026-03-17 | approve same pin after setup QA |
| NEXT_PUBLIC_APP_URL | localhost:3001 | `https://thefatkiller-web-git-feature-sprint-14-laun-9d09ee-projects-tam.vercel.app` | `https://app.thefatkiller.com` |
| FOOD_PHOTO_CLEANUP_SECRET | generated temporary test secret | disabled until scheduler approval | independently rotated >=32 characters, no public prefix |
| TFK_PERFORMANCE_LOGS | optional metadata-only profiling | temporary branch profiling if needed | disabled unless sampling/log budget approved |
| Future Stripe secrets | test-mode only | test-mode webhook signing secret | live secret and endpoint secret after commercial requirements |

Neither an OpenAI key nor a service-role key may be NEXT_PUBLIC, committed, sent to browser responses, or logged. Provider calls are explicit user actions, not render/prefetch operations. Do not copy staging identities/data to Production as a setup shortcut.

Observed architecture: Vercel project thefatkiller-web, Next.js, apps/web root, Node 24.x, Git main production branch. Existing default region iad1; staging database ap-northeast-1 (Tokyo). The branch requests hnd1 to colocate Preview compute with staging. Before merging/configuring Production, confirm the dedicated Production database region also matches this runtime region, or revise the deployment plan. No current Production deployment settings were changed.

## Dedicated Production Supabase procedure

1. Obtain owner approval for project, organization/plan, region, commercial domain, data residency, RPO/RTO and spend.
2. Create an empty project; record identifiers without credentials. Keep application jobs disabled.
3. Use the reviewed complete migration inventory (30 after the lifecycle and backup hardening phases) and production-safe catalog seeds only. Never seed QA users, internal Premium grants, photos, coaching data or test insights.
4. Rehearse both zero-to-current and the actual predecessor-to-current upgrade path locally; compare migration versions and function definitions. Apply forward migrations with the standard CLI; never repair/mark/revert history to make parity appear clean.
5. Configure the dedicated Production Supabase Auth project with Site URL `https://app.thefatkiller.com` and only the exact web callbacks `https://app.thefatkiller.com/auth/callback` and `https://app.thefatkiller.com/auth/recovery-callback` plus any separately reviewed native callback. Do not use a temporary Vercel deployment URL or wildcard. Configure the approved email provider and password/recovery protections, and enable leaked-password protection before public launch if supported by the purchased plan. These are planned settings, not current Production state.
6. Configure only the approved environment's credentials; use separate AI spend limits, alerts, and rotation ownership.
7. Back up database AND Storage objects, prove a restore, then perform explicitly authorized Production security/route QA. Release/scheduler activation is a separate decision.

## Background jobs (disabled remotely)

Notification evaluator: public.generate_due_notifications(), bounded users/candidates, per-user locks, rolling cap, dedupe, quiet hours and preference opt-in. Local concurrency/adversarial tests exercise manual/cron overlap. No historical preference backfill. Round-robin throughput at >100 configured users needs a capacity review before activating at scale.

Food cleanup: expired pending/failed photos eligible after 24 hours; Storage API deletion, bounded batches, leases/fencing, expected owner/id/attempt path, idempotent missing-object deletion. Completed/confirmed current objects are not prematurely deleted. Local real pg_cron tick proved deletion; test job/secret were removed. Retention is not an operational guarantee remotely until an approved persistent job runs.

The owner confirms the previous bounded staging scheduler soak passed. Its
recorded post-soak evidence shows all 48 table fingerprints plus the additional
food-photo, weekly-insight and notification fingerprints matched baseline. A
current read-only staging check showed no installed Cron job, consistent with
the recorded configured 0/active 0 state. Remote schedulers remain disabled;
no activation occurred during final acceptance.

Staging activation procedure, only after separate approval:
- Capture baseline fingerprints and counts. Confirm exact deployed endpoint, migrated versions, feature flags, reminder opt-in population and no queued historical flood.
- Notifications: schedule the reviewed SQL evaluator with pg_cron; start with one explicit run and inspect metadata counts, then an approved cadence. Do not blindly reuse the local job name in another environment.
- Cleanup: provision endpoint URL and independently generated worker secret in Vault; match only that staging Preview/server secret. Run scripts/food-photo-cleanup-schedule.sql only after approval. Never put a bearer value or service-role key in cron.job command text.
- Run a bounded soak; record start/end counts, error counts, leases, deletion success, latency and no residue. On error disable the named job immediately and reconcile outstanding leases before retrying.
- Disable with cron.unschedule(jobid) after verifying the exact named job/environment. Revoke temporary worker secret after soak. Do not disable other projects' jobs.

## Backup and restore

Staging backup capability was verified on 2026-09-15: linked organization Pro, seven completed daily physical backups, PITR disabled. Storage bytes require separate protection. Production backup settings were not inspected. The extended local fixture recovery passed 15/15; a real cloud restore and delivered failure alerts remain unverified.

Remote Storage provisioning is intentionally deferred and does not block the
remaining Sprint 14 implementation/manual-QA work. It still blocks a claim of
full disaster-recovery or Production launch readiness: database backups do not
contain Storage object bytes; the implemented exporter/verifier is locally
verified only; no external encrypted destination exists; hourly Storage RPO is
not achieved; the four-hour recovery target is not proven; and cloud restore
plus backup-alert delivery remain pending.

Use the [backup, restore and alert-delivery runbook](backup-restore-runbook.md) for scope, independent Storage export, retention, credentials, proposed RPO/RTO, safe new-project cloud rehearsal and alert acceptance. No operational exporter or alert delivery was activated. `CLOUD_RESTORE_MANUAL_STEP_REQUIRED` remains a launch step.

## Incident procedures

- **Database failure:** freeze writes/jobs if required; capture incident time; choose verified backup/PITR point; restore to isolated project; reconcile storage and post-backup records; validate before approved cutover. Never restore over live data without explicit authorization.
- **Bad migration:** stop further rollout; snapshot evidence; prefer reviewed forward-fix migration. A Git rollback cannot undo SQL. Do not manipulate migration history. Destructive restoration requires data-loss analysis and owner approval.
- **OpenAI compromise/outage:** revoke affected provider key, disable generation configuration, preserve completed results, rotate only the affected environment. Inspect metadata/costs, not health payloads. No automatic retries; existing explicit retry budgets and leases apply. Manual nutrition remains available.
- **Supabase privileged key compromise:** revoke/rotate supported project keys, disable trusted worker/generation paths, update server-only environment and Vault secrets, redeploy only authorized environments, examine access metadata and verify client bundles do not contain the key. Consider session invalidation separately; key rotation is not assumed to revoke all JWT sessions.
- **Vercel regression:** identify exact known-good deployment and compatible schema. Obtain Production rollback authorization; promote/rollback only that deployment. Check schema compatibility first. This runbook does not execute it.
- **Scheduler failure/flood:** unschedule exact job, revoke HTTP cleanup secret if needed, inspect bounded metadata counters and dedupe/lease state; do not bulk delete user notifications or force-expire current photos.

## Monitoring

Data SDK failures emit fixed operation name, HTTP status and elapsed milliseconds; latest-weight diagnostics emit sanitized provider error code only. No user IDs, query strings, signed URLs, raw health fields or provider payloads. AI logs retain status/model/latency/token metadata only. Cleanup endpoint logs a fixed failure event. Alert routing/retention/on-call ownership is not configured yet and is a launch requirement. The [backup and alert-delivery runbook](backup-restore-runbook.md#failure-handling-and-delivered-alerts) specifies worker/backup freshness checks, delivery, escalation and acceptance tests. Suggested signals: sustained 5xx, elevated auth/RPC failures, provider error/cost spikes, cleanup eligible backlog/oldest age, and missed scheduler ticks. Set thresholds from a controlled soak; do not claim an alert works until delivered and acknowledged.

Alert delivery is intentionally deferred while no dedicated destination exists.
The existing sanitized hooks remain in place, but backup, notification-scheduler
and food-photo-cleanup failures are not delivery-tested, and independent
monitoring is pending. This does not block the remaining Sprint 14 code/manual
QA; it remains an explicit Production launch risk. Do not configure a new
email/SMTP, chat, SMS or third-party monitoring service solely to clear this
item, and do not claim complete operational alert readiness.

## Privacy and deletion

Owner health/progress/nutrition/check-ins/GLP-1, photos, private insights and coaching records remain protected by RLS and existing relationship/category-sharing rules. Weekly AI receives allowlisted aggregate activity only, not GLP-1, medications, notes, photos or auth/billing IDs. Photo AI receives the normalized submitted image and returns editable estimates; store:false is used. Current successful photos are deleted; abandoned/failed objects need the scheduled 24-hour cleanup operationally active.

The implemented user-facing account-deletion workflow requires the exact
confirmation phrase, queues the authenticated owner, revokes refresh sessions,
freezes writes, and uses the bounded trusted worker to delete exact private
Storage paths before Auth deletion and database cascades. Local Auth/Storage E2E
and worker tests passed. Remote operational completion still requires an
approved worker cadence or operator process, monitoring, and residue checks;
no scheduler is active. Never delete `storage.objects` metadata directly.
Backups/legal retention need an approved policy, including deletion handling in
future remote object archives; this report does not make a legal compliance
claim.

## Stripe readiness

Current resolver consumes user_subscriptions and plan_entitlements, with internal/manual providers explicitly distinct from paid checkout. Future Checkout uses authenticated owner and server-selected price IDs. Verify webhook signature on raw bytes; persist event ID uniquely and process transactionally; map only trusted customer/subscription-to-user associations; handle checkout, renewal, cancellation, delinquency and out-of-order delivery. Update user_subscriptions; continue existing resolver/RLS. No major entitlement redesign is indicated, but prices, trials, taxes, refunds, countries and payment terms require decisions before implementation. Internal test grants are not evidence of payment.

## Production application domain

The canonical Production application origin is `https://app.thefatkiller.com`.
Keep the verified Sprint 14 Preview origin and its exact callback URLs for
staging; never replace staging with this Production hostname. Temporary Vercel
deployment URLs may be used for deployment diagnosis, but must not become the
long-term Production Site URL or Auth callbacks.

Read-only readiness audit on 2026-09-15:

| Check | Observed result | Disposition |
| --- | --- | --- |
| Project attachment | Vercel dashboard lists `app.thefatkiller.com` on team `projects-tam`, project `thefatkiller-web`, as `Valid Configuration` and `Production`. Local linkage names the same project. | Attached to the intended project; no attach/move action required. |
| DNS | Cloudflare and Google public resolvers return `app.thefatkiller.com` as a CNAME to `dea61c18f652e0f9.vercel-dns-016.com`; it resolves to Vercel edge addresses `216.150.1.1` and `216.150.16.1`. Vercel reports the configuration valid. | DNS currently reaches Vercel; no DNS change was made. Re-check immediately before activation. |
| TLS | HTTPS negotiates a Let's Encrypt certificate whose CN and SAN are `app.thefatkiller.com`, valid 2026-09-15 06:55:57 UTC through 2026-12-14 06:55:56 UTC. Chain/hostname verification succeeds and the response includes HSTS. | SSL is currently valid and Vercel-managed; re-check issuance/renewal and hostname coverage at activation. |
| Redirects | `http://app.thefatkiller.com/` returns 308 to HTTPS. The canonical HTTPS root returns 307 to `/login`. `https://thefatkiller-web.vercel.app/` returns 308 to `https://app.thefatkiller.com/`. | Canonicalization is working for the app and project default hostname. Re-test callback paths and `next` rejection after Production Auth configuration. |
| Current destination | The domain is currently assigned to Vercel Production deployment `9PWS1An3EEvrAqHN1adDdDWk2KQr`, a Ready/Latest `main` deployment of commit `ff9179d06cafc4c5151ebceef4b79bb5b5aa7cc8`. | The hostname already points at a Production deployment. Do not treat attachment as launch approval or promote another deployment without authorization. |
| Apex and `www` | `thefatkiller.com` resolves separately through Cloudflare; `www.thefatkiller.com` is a CNAME to `sites.ludicrous.cloud`. Both HTTPS roots currently return 404 and neither redirects to the app. | They are not Production Auth origins and must not be added to the Auth allow-list merely as aliases. Before launch, the domain owner must decide whether they intentionally remain separate, serve marketing, or redirect; implement and verify that decision in the owning platform as a separate approved change. |

Before Production activation:

1. Obtain explicit Production authorization and confirm the intended release commit, deployment, environment ownership and rollback target; do not assume the deployment currently serving the domain is the Sprint 14 release.
2. Create and migrate the dedicated Production Supabase project using the procedure above, with jobs disabled and no staging identities or credentials.
3. Configure `NEXT_PUBLIC_APP_URL=https://app.thefatkiller.com` and the dedicated Production Supabase public/server credentials only in the Production environment, then deploy through the approved release workflow.
4. Configure the Production Supabase Auth Site URL and the two exact app callback URLs above. Preserve any native callback only after its own review. Do not add wildcard, Preview, apex or `www` web callbacks.
5. Verify TLS, HTTP-to-HTTPS, `/login`, confirmation/recovery callback handling, malicious redirect rejection and no role/plan grants. Obtain approval before sending a real recovery email.
6. Decide and verify the separately hosted apex/`www` experience so an intentional marketing route or redirect replaces the current public 404s if required.
7. Complete the remaining backup/restore, delivered-alert, scheduler, data-retention, operational account-deletion, observability and authenticated release QA gates elsewhere in this runbook before declaring Production active.

This audit was read-only. It did not change DNS, domain attachment, Vercel
environment variables, Supabase Production configuration, deployments or
promotion. Deployment Protection must still be reviewed for QA usability and
access restriction; it is not a replacement for application authorization.

Sources: https://supabase.com/docs/guides/platform/backups ; https://supabase.com/docs/guides/auth/password-security ; https://supabase.com/docs/guides/auth/rate-limits ; https://supabase.com/docs/guides/deployment/going-into-prod .
