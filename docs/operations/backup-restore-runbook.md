# Backup, restore and failure delivery

Verified 2026-09-15 for TFH Staging (`nxppfepdgvevlmthzacc`), Sprint 14. This is a recovery runbook and a record of limited rehearsal evidence, not authorization to modify Production. Executable Storage export, archive verification, retention-prune and alert-hook tooling now exists in the repository. No remote destination, alert recipient/service or scheduler was configured or activated in this phase.

Remote Storage backup provisioning is intentionally **DEFERRED**. This does not
block the remaining Sprint 14 implementation and QA work, but it remains an
explicit Production launch prerequisite and risk. Current recovery posture:

| Evidence or capability | Current status |
| --- | --- |
| Supabase database backup | Active on staging; completed daily physical backups observed |
| Storage bytes in database backup | **Not covered** |
| Storage export/restore tooling | Implemented and locally verified |
| External encrypted Storage destination | **Not configured** |
| Hourly Storage RPO | **Not achieved** |
| Four-hour recovery target | **Not proven** |
| Cloud restore rehearsal | **Pending — `CLOUD_RESTORE_MANUAL_STEP_REQUIRED`** |
| Backup alert delivery | **Pending; integration point only** |

Do not describe this state as full disaster-recovery readiness. Provisioning
Cloudflare R2, S3 or another external Storage provider requires a separate
owner decision and is not part of the current continuation.

## Verified capability and recovery scope

The linked organization API reports **Pro**. The staging backup API returns seven `COMPLETED` physical backups, one per day from September 8–14, latest `2026-09-14T16:54:15.419Z`. `walg_enabled=true`; **`pitr_enabled=false`**. WAL-G alone is not proof of PITR. The observed inventory matches Pro's documented seven-day daily-backup retention. Daily timing is observed around 16:54–16:57 UTC, not a promised fixed execution time. Monitor freshness rather than assuming a backup ran.

Database backups cover PostgreSQL, including Auth records. They do **not** contain Storage object bytes. A database restore cannot recover deleted images without a separate object copy. Custom database-role passwords need recovery/reset handling. Physical backups are not a substitute for an independent downloadable logical export. See [Supabase backup scope and retention](https://supabase.com/docs/guides/platform/backups).

The documented new-project restore includes schema, data/indexes, roles/permissions, Auth accounts/password hashes/authentication records and the encryption root key. Storage objects/settings, Auth settings/API keys, Edge Functions, Realtime settings, database extensions/settings and replicas need explicit review/reconfiguration. The feature requires a paid plan and physical backups, which this staging project has; actual dashboard availability and successful execution remain unverified. See [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

Auth **data coverage is confirmed by documented restore scope**; working sign-in/session recovery after a full cloud restore is not yet tested. Do not describe the local fixture test as full Auth disaster recovery. Treat restored Vault secrets and authentication records as sensitive even in an isolated recovery project.

## Responsibilities and proposed recovery objectives

Before launch, the project owner must name a primary recovery operator and a backup operator, approve the destination and access policy, and accept these objectives. They are proposals, not measured guarantees:

| Asset | Proposed recovery point objective (RPO) | Recovery time objective (RTO) / limitation |
| --- | --- | --- |
| PostgreSQL + Auth records | Up to 24 hours under healthy daily backups; increases on missed backup | Target 4 hours including validation; unmeasured at cloud scale |
| Progress images | Hourly independent export, plus execution time; not active yet | Target within the same 4-hour recovery window; measure using full object volume |
| Temporary food images | Best effort, hourly only while eligible; loss is acceptable only with owner-approved retry/manual-log behavior | Never recover an expired, deleted or completed photo merely to meet an RTO |
| Current effective Storage protection | No operational independent export destination yet | No bounded Storage RPO/RTO can currently be claimed |

An incident recovery point must reconcile both database and object backup times. Report missing images and post-backup writes explicitly. Do not invent a consistent full-system snapshot from exports captured at different times. PITR would require a separately approved add-on/compute decision; it was not enabled.

## Operational Storage export procedure

The repeatable implementation is `scripts/storage-backup.py`. Migration `20260915070558_sprint_14_storage_backup_inventory.sql` exposes a read-only, service-role-only inventory RPC. It joins application owners to exact Storage objects, excludes accounts queued for deletion, and selects food objects only while `pending`/`failed` and unexpired. It does not configure a destination or scheduler. Use a dedicated trusted operations runner outside the web request/runtime and outside the source Supabase failure domain. Start with a supervised staging export to an approved encrypted destination; only then approve scheduling. No real user images were exported in this phase.

1. Use an encrypted working volume, restrictive permissions (`umask 077`) and TLS. Inject source-only service credentials from an approved secret manager into process memory. Do not place keys in arguments, manifests, Git, browser code or logs. A read-only database login inventories data; Storage export needs authorized private-object read access. If a broad service-role key is unavoidable, restrict runner access/network and rotate it; the application must not gain backup privileges.
2. Record run ID, source project, UTC start/end, schema/migration inventory and database backup/recovery point. Record private bucket settings separately: name, public flag, size limit and allowed MIME types. Include database metadata alongside bytes: application owner UUID, row ID, exact bucket/path, original Storage owner fields, object ID/version, content type, cache-control, size, creation/update time and food expiry/status. Never include signed URLs, credentials or AI payloads in operator logs.
3. Enumerate with the bounded `storage_backup_candidates` RPC using deterministic `(bucket_id, object_path)` keyset pages of at most 100. Progress candidates are existing `public.progress_photos` joined by exact `storage_path` to `storage.objects` in `progress-photos`. The RPC and exporter require the first path segment to equal the row's `user_id`. Reject ambiguous paths and metadata inconsistencies without copying another user's object.
4. Food candidates are `public.food_photo_analyses` joined by exact path to `storage.objects` in `food-analysis`. Require `status in ('pending','failed')`, non-null path, `expires_at > clock_timestamp()`, and exact path `user_id/id-attempts.jpg`. Exclude completed, confirmed and expired analyses and owners pending deletion. A confirmed/completed photo left behind is a cleanup incident, not a backup candidate. Do not export arbitrary orphan objects automatically.
5. Download original bytes through the authenticated Storage API, never public or signed links in manifests. The command permits at most four concurrent downloads, 100 objects per inventory page, three request attempts, a 10 MiB per-object limit and explicit object/total-byte bounds. Validated object keys are written under `objects/<bucket>/<original path>` so bucket/path are preserved without permitting absolute paths, traversal or cross-owner paths. Calculate SHA-256 and actual byte length.
6. Re-read source row/object version and eligibility after download. If changed, retry a bounded number of times or record a failed/inconsistent run. If deleted, completed or expired, discard that local copy. Record skipped reasons/counts. A missing object still referenced by eligible metadata is a failure to investigate, not silent success.
7. Create a manifest with recovery fields, application/Storage owner metadata, exact bucket/path, SHA-256 and actual byte size. The tool verifies the plaintext assembly, encrypts with `age`, decrypts the completed archive from its destination and verifies it again before reporting `BACKUP_COMPLETE`. Immutable run IDs and refusal to overwrite make retries safe; a failed multi-archive run removes archives created by that attempt and never replaces the last good run. Partial plaintext stays on the explicitly supplied encrypted work volume and is deleted on exit. Do not use mirror-delete semantics: deleting the source must not silently erase the only progress recovery copy.
8. Temporary food objects are placed in a separate encrypted archive whose filename contains `food-delete-by-<earliest original expires_at>`. The verifier rejects an archive after any contained food object has expired. Run `backup:prune-food` at least as often as export; it is dry-run by default and `--apply` removes only strictly named food archives past that deadline. The approved remote destination must independently enforce the same deadline and earlier successful-processing/account-deletion removal before scheduling is activated. Do not place food objects in the progress archive or seven-day immutability. Progress retention is proposed at seven days, subject to approved account-deletion policy, with restore-time deletion tombstones to prevent resurrecting deleted accounts/photos.
9. Encrypt in transit and at rest using approved managed encryption/KMS or a standard authenticated-encryption backup product, not custom cryptography. Separate encryption-key administration from backup-data access. Test key recovery with the backup operator. Limit read/restore access, audit access, prohibit public buckets, and retain sanitized success/failure receipts independently of backup files.

A successful receipt contains only environment, run ID, start/end, counts, bytes, skipped counts, checksum verification status and destination receipt ID. Names, object paths and health information remain inside the encrypted manifest. Stop and alert if space, authorization, encryption, checksums or eligibility cannot be established safely.

### Commands and required secret injection

Install the standard [`age`](https://age-encryption.org/) CLI on the trusted runner. Generate and escrow its identity outside Git, place the identity file on the encrypted work volume with operator-only permissions, and inject the service role only through the environment. `TFK_BACKUP_AGE_RECIPIENT` is the public recipient; `TFK_BACKUP_AGE_IDENTITY` is the path to the escrowed private identity, never the key contents.

```sh
export SUPABASE_URL='https://<approved-project-ref>.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='<from-approved-secret-manager>'
export TFK_BACKUP_AGE_RECIPIENT='age1...'
export TFK_BACKUP_AGE_IDENTITY='/approved/encrypted-work-volume/age-identity.txt'

pnpm backup:storage -- \
  --destination /approved/encrypted-destination/tfk-storage \
  --work-dir /approved/encrypted-work-volume \
  --max-objects 10000 \
  --max-total-bytes 53687091200
```

Do not use `.env.local` as an operations secret store. The destination path above is deliberately a placeholder; **Production has no approved destination yet**. Before the first supervised staging run, confirm the destination is private, independently controlled, TLS-protected when remote, encrypted at rest in addition to application-layer `age`, non-overwriting, auditable, capacity monitored and configured with the required food expiry lifecycle.

Verify either produced archive independently. This detects a missing manifest/object, mismatched size/checksum, owner/path mismatch, duplicate entry, unsafe path, expired food entry and unexpected file:

```sh
pnpm backup:verify -- /approved/encrypted-destination/tfk-storage/<archive>.tar.age \
  --work-dir /approved/encrypted-work-volume
```

Inspect food expiry without deleting anything; add `--apply` only in the approved retention job:

```sh
pnpm backup:prune-food -- --destination /approved/encrypted-destination/tfk-storage
```

The command's service role can read all private user images. Restrict the runner and its logs, rotate the credential after suspected exposure, and never use this tooling from a browser, application request or developer workstation against Production.

## Database export and restore preparation

Daily cloud backups are the current database protection. Before relying on them, record the backup inventory and freshness independently each day. An additional logical export can protect against source-project/account loss; its destination/credentials/retention need approval and are not configured here. Use the installed CLI's documented `db dump --help` workflow for roles, schema and COPY data; verify that `auth`, application/private schemas, migration inventory and relevant Storage metadata are actually included. Do not assume a public-schema-only dump covers Auth. Encrypt dumps immediately and never attach them to a PR.

Keep code/migrations and non-secret environment configuration versions alongside the recovery manifest. Preserve extension versions and required settings. Keys, SMTP/OAuth credentials, JWT configuration, API keys, Storage bytes and external provider configuration require a separate secret/configuration recovery plan. Do not commit their values. Restore into a compatible isolated target; restore required roles/schema before data, then verify constraints, indexes, RLS and functions. Do not disable constraints and declare success without validating them afterward.

## Safe cloud rehearsal — CLOUD_RESTORE_MANUAL_STEP_REQUIRED

No cloud restore was performed. A same-project restore rewinds staging and is prohibited in this task. A new project can incur costs and contain copied secrets/user data, so obtain specific owner approval for the target, budget and restricted access before proceeding.

1. In the **staging** dashboard confirm project ref, Pro plan, physical backup inventory and selected timestamp. Record source fingerprints and disabled jobs. Select **Database → Backups → Restore to a New Project**, not the in-place restore action. If that tab is unavailable, stop and resolve entitlement with the account owner/Supabase; do not substitute an in-place restore.
2. Have the owner approve a uniquely named disposable recovery project, region, compute and deletion deadline. Confirm it has no application deployment, Production domain, external webhooks or email/AI/payment worker integration. Assess restored cron jobs/Vault secrets before creation: choose a backup known to predate any remote job activation. For this audit the latest listed backup predates the controlled soak, but verify the chosen point again. If isolation from outbound work cannot be guaranteed, stop and arrange a supported isolated restore with Supabase.
3. Restore the chosen backup into that new project. Record start, ready time and backup ID. Do not alter source migration history. Verify the clone's reference before every subsequent command. Immediately verify cron jobs are absent/disabled, and never install live worker credentials.
4. Compare schema/migrations, extensions, FK validity, table counts and fingerprints against the selected backup's evidence, accounting explicitly for writes after that point. Verify Auth IDs and a disposable account's sign-in using target-only settings. Do not send password resets to real users or copy Production API/provider credentials. Review/revoke copied sessions before any intended live cutover.
5. Recreate private bucket configuration using supported APIs, then restore only approved, still-retainable manifest entries and their matching application rows/owners. Verify SHA-256 before and after upload, content type, bucket privacy and exact owner path. Refuse overwrites by default. If restored Storage metadata exists but bytes are missing, resolve using a supported Storage restore/import path on the clone; do not write `storage.objects` manually. Service-role uploads may not preserve the original `owner_id`; verify any policy depending on it and use a supported owner-preserving import or authenticated owner upload. Never silently substitute another owner's identity.
6. Run owner A/B, coach-denial, unauthenticated, entitlement and path-isolation tests using disposable accounts. Confirm no AI generation on read and no notifications sent. Test one restored progress image and one unexpired synthetic food image; ensure expired photos remain absent. Verify account-deletion tombstones before making any restored data visible.
7. Record achieved RPO, measured RTO, missing data, object checksums, Auth behavior, test results and operator signoff. No cutover is authorized by a rehearsal. Delete the disposable target on its approved deadline, revoke temporary credentials and retain only sanitized evidence. Recheck source fingerprints/jobs unchanged.

## Local evidence and its limits

Run `python3 scripts/test-backup-restore.py` with local Docker/Supabase available. It refuses a non-local API URL. The rehearsal exports a disposable schema plus fixture application rows and a separate manifest/byte copy for both private buckets, deletes those disposable rows/objects, and restores them. It tests retained Auth-owner FKs and paths, excludes an expired food image from export, validates checksums before/after upload, and verifies fixture removal. It uses service-role fixture uploads with no claim to preserve an original end-user Storage `owner_id`.

2026-09-15 final rerun: **15/15 passed, 1.94 seconds**. The operational checksum suite also passed **8/8** and the backup-inventory pgTAP suite passed **9/9**. No real staging data, cloud backup, full Auth recovery or large-volume cloud RTO is proven by those results. Temporary plaintext fixture artifacts are deleted by the test; this is not a remote encrypted export execution.

## Failure handling and delivered alerts

Current delivery readiness: **INTEGRATION POINT PREPARED; DESTINATION NOT CONFIGURED / NOT DELIVERY-TESTED**. `scripts/ops_alert.py` emits a fixed, sanitized `tfk.ops-alert.v1` payload for `backup_failure`, `notification_scheduler_failure` and `food_cleanup_failure`. It requires an HTTPS endpoint from `TFK_OPS_ALERT_WEBHOOK_URL`, supports a secret-manager-injected bearer token, contains no arbitrary error text/recipient, and refuses delivery when unconfigured. The Storage exporter invokes it on failure only when a destination is configured. The notification and cleanup schedulers must invoke the same command from their independent monitor/orchestrator on failure. No recipient, webhook, email address, Slack channel or service was selected.

Alert delivery is intentionally **DEFERRED** and does not block the remaining
Sprint 14 code or QA work. Keep the sanitized hooks and validation tests, but do
not configure email/SMTP, Slack, Discord, SMS or a third-party monitor solely
for delivery. This remains a Production operational risk and prerequisite:

| Alert capability | Current status |
| --- | --- |
| Alert destination | **Not configured** |
| Backup failure delivery | **Not delivery-tested** |
| Notification scheduler failure delivery | **Not delivery-tested** |
| Food-photo cleanup failure delivery | **Not delivery-tested** |
| Independent monitoring and heartbeat | **Pending** |

Do not describe the integration hook or its local payload tests as complete
operational alert readiness.

Validate payload shape without delivery:

```sh
python3 scripts/ops_alert.py backup_failure --validate-only
python3 scripts/ops_alert.py notification_scheduler_failure --validate-only
python3 scripts/ops_alert.py food_cleanup_failure --validate-only
```

Minimum launch design: an independently hosted operations monitor polls read-only status every minute, sends through an approved existing email/incident channel to a named primary and backup operator, and has its own externally monitored heartbeat. No paid service, recipient subscription or outbound message was configured in this phase. Owner must approve sender/recipient and hosting before activation. An existing approved host/SMTP service can avoid a new paid vendor; do not claim it exists until verified.

| Signal | Initial rule | Evidence and response |
| --- | --- | --- |
| Notification job | Any failed run or no success for two scheduled intervals plus 2 minutes | Inspect `cron.job_run_details` and evaluator result/error counters. Alert even if the job was unexpectedly removed. Pause via approved incident procedure if duplicates/cap violations appear. |
| Food cleanup | Any failed run/HTTP timeout/non-2xx, semantic failure count >0, or no successful completion for two intervals plus 2 minutes | Correlate cron dispatch to actual HTTP response and worker completion. A successful `pg_net` enqueue is not completion. Also alert on growing eligible backlog/oldest expired age beyond two intervals. |
| Backup/export | Nonzero exit, checksum/encryption failure, incomplete manifest or no verified success within 75 minutes for hourly export | Keep last good snapshot; bounded retry; alert primary immediately, escalate to backup after 15 minutes unacknowledged. Track recovery state after acknowledgement. |
| Daily database backup | No completed backup newer than 26 hours or explicit failed backup | Query backup metadata from outside Supabase. Record actual degraded RPO; escalate rather than assuming next day's run fixes protection. |
| Server errors | Proposed >=5 relevant 5xx in 5 minutes; tune after launch | Use sanitized aggregate counts or approved native anomaly alerts. Never include request bodies/keys/health data. Low-volume worker failures must have their own deterministic alert. |
| Monitor failure | Missing external heartbeat for 5 minutes | Independent delivery path must alert; a monitor cannot reliably report its own total outage. |

Expected-disabled environments must be explicitly marked disabled so current staging does not generate missed-job alerts. Unexpected activation is itself an alert. Polling failure/auth failure must be reported, never treated as zero failures. Deduplicate alerts per incident, send recovery notices, retain acknowledgement and escalation times, and do not leak raw database errors or response bodies.

Supabase Cron documents `cron.job` and `cron.job_run_details` for monitoring; this is evidence storage, not an established email delivery channel. See [Supabase Cron](https://supabase.com/docs/guides/cron). Vercel native Alerts can deliver error/usage anomaly notices through email, Slack or webhooks on the documented eligible plans with Observability Plus. Activity thresholds/baseline variance mean a few failed worker requests may not trigger an anomaly. This account's entitlement, destinations and delivery are not verified, and no upgrade is approved. See [Vercel Alerts](https://vercel.com/docs/alerts). These alerts cannot replace backup freshness or missed-job monitoring.

Before launch: use synthetic monitor inputs to inject a failed cron run, HTTP failure, failed export, stale backup and missed heartbeat; verify delivery, acknowledgement, escalation and recovery at the approved recipient. Do not intentionally fail a live worker or export real health data for this test. If no recipient/host is approved or delivery fails, retain an alert-readiness launch blocker.
