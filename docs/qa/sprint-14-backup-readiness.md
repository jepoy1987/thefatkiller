# Sprint 14 backup readiness — 2026-09-15

Decision: **BACKUP_NEEDS_MANUAL_CLOUD_VERIFICATION**.

Base HEAD: `6d01efda61358fa48f91271f529dc0f3ce6999c1`, branch `feature/sprint-14-launch-hardening`. This phase adds documentation, read-only backup inventory RPCs and offline operational tooling; no scheduler activation, cloud restore, deployment, Production configuration or merge.

## Live staging evidence

- Project API confirms TFH Staging, `nxppfepdgvevlmthzacc`, Tokyo, PostgreSQL 17, active healthy.
- Linked organization API explicitly reports **Pro**.
- Backup list: seven completed physical backups, daily September 8–14; latest `2026-09-14T16:54:15.419Z`. Observed inventory agrees with documented Pro seven-day retention.
- PITR false; WAL-G true. No point-in-time restore capability was inferred from WAL-G.
- PostgreSQL backup covers Auth data according to official restore documentation. Auth configuration and complete sign-in recovery remain separate verification requirements.
- Storage bytes are not covered by the database backup. The repository now contains an executable bounded export and verifier, but no independent remote destination or scheduled execution is provisioned. No real user photos were downloaded.
- Read-only `cron.job` check: configured 0, active 0.
- All 48 staging table fingerprints match the post-soak baseline. Additional food-photo, weekly-insight and notification fingerprints also match.
- No staging fixture insertion or deletion in this phase; no QA residue introduced.

## Local evidence

`python3 scripts/test-backup-restore.py`: **15/15**, final elapsed **1.94 seconds**.

The test exports a synthetic schema and real application fixture rows, creates recovery manifests and original JPEG copies in both private buckets, excludes an expired food image, deletes eligible fixture rows/objects, restores them, and verifies application Auth-owner FK/path correctness and SHA-256 checksums. It verifies the excluded control is unchanged, both buckets stay private, and all fixture Auth/Storage residue is removed. No provider calls. This is not a whole-database/Auth restore, cloud backup restore, original Storage owner_id recovery, or full-volume RTO measurement.

`python3 scripts/test-storage-backup.py`: **8/8** manifest/checksum, retention and alert-hook tests pass. Coverage proves a matching manifest succeeds and missing, corrupted, unexpected, expired-food and owner/path-mismatched objects fail. Retention tests prove only strictly named food archives past their encoded delete-by timestamp are selected for pruning. `supabase/tests/storage_backup.test.sql`: **9/9** proves bounded inventory, source missing-object surfacing, pending-deletion exclusion, expired/completed food exclusion, a post-download eligibility fence and service-role-only access.

## Tooling status

| Capability | Status |
| --- | --- |
| `progress-photos` export | Implemented; exact bucket/path and owner metadata preserved |
| Eligible `food-analysis` export | Implemented; only pending/failed, unexpired, exact generated paths; rechecked after download |
| Encryption | Required `age` recipient encryption; encrypted-work-volume staging; destination archive decrypted and reverified before success |
| Bounds/retry | 100-row keyset pages; concurrency 1–4; max objects/object bytes/total bytes; request deadline; 1–3 attempts |
| Manifest verification | Implemented; SHA-256/size, missing/corrupt/unexpected/duplicate/unsafe/expired checks |
| Food retention | Separate earliest-expiry archive; verifier expiry refusal; dry-run-by-default prune command; remote lifecycle still required |
| Remote destination | **NOT CONFIGURED / NOT EXECUTED** |
| Scheduled hourly execution | **NOT CONFIGURED / NOT PROVEN** |
| Alert delivery | Hook supports all three required failures; **recipient/destination not configured or delivery-tested** |
| Cloud restore | **CLOUD_RESTORE_MANUAL_STEP_REQUIRED** |

Final gates:

| Gate | Result |
| --- | --- |
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm test | 348/348 (web 262, shared packages 86) |
| pnpm build | PASS |
| git diff --check | PASS |
| Local DB + Storage recovery | 15/15 |
| Storage manifest/checksum/retention/alert hook | 8/8 |
| Backup inventory pgTAP | 9/9 |
| Local Supabase advisors | PASS; no errors, seven pre-existing training-policy performance warnings |

No SQL migration or application behavior changed. The requested relevant backup rehearsal ran; full DB/security counts from earlier Sprint 14 QA are not represented as rerun in this phase.

## Remaining launch steps

1. **CLOUD_RESTORE_MANUAL_STEP_REQUIRED:** authorize a disposable paid cloud recovery target and execute the new-project procedure, never overwrite staging. Verify DB/Auth/RLS, Storage recovery and actual recovery time.
2. Approve the independent remote encrypted Storage destination/runner, `age` key custody, progress retention/deletion handling and per-food-archive expiry lifecycle. Apply the inventory migration to the approved environment, run a supervised export/independent verify, then schedule hourly export plus food pruning and freshness monitoring. Current operational Storage RPO is not bounded.
3. Name the alert recipient/destination and independent monitor, then delivery-test failed/missing notification work, food cleanup failure, stale backups, export/checksum failure, escalation, acknowledgement and monitor heartbeat loss. Logs and payload validation do not establish delivery. No alert message or paid service was configured.
4. Accept recovery objectives: healthy daily DB RPO up to 24 hours, proposed hourly progress-object export, provisional 4-hour end-to-end RTO. These are targets, not measured cloud guarantees.

See [operational runbook](../operations/backup-restore-runbook.md) for the procedures and official sources. Production remained untouched/unverified. Staging schedulers stayed disabled. PR #16 was not merged; this task stops at the backup phase.
