# Sprint 14 lifecycle hardening

Continues PR16 after navigation acceptance. Production is untouched; no merge or persistent remote scheduler activation is authorized.

## Replay protection

`replay_safe_mutation` binds a timestamp/UUID request key, operation and payload fingerprint to `auth.uid()`. A per-owner transaction lock makes mutation + receipt atomic; response-loss retries return the saved result. Changed payloads conflict; different keys remain different operations. Food/quick-add/saved-meal/water actions and training start/complete use it. Training keys are captured in form data before execution, retained on failure, and rotated on successful UI completion. Existing completion/set uniqueness remains.

Keys expire after seven days. The timestamp is part of the key, so expired requests remain rejected after pruning. At most 2,000 live receipts per account; expired receipts are removed on the next request. A service-only bounded prune function supports operator maintenance. Receipts store a fingerprint/result ID, not health payloads. Direct clients can still intentionally create independent operations; idempotency does not deduplicate all identical meals or replace authorization.

Local: 24 simultaneous same-key water requests produce one result; lost response retry, conflicting payload, expiry, owner isolation and failed transaction rollback tested. SQL tests also cover food snapshots and self-directed workout replay.

## Account deletion

Authenticated `/settings/account` requires the exact phrase `DELETE MY ACCOUNT`; it accepts no target user ID. A durable private queue revokes refresh sessions and blocks new authenticated writes, including stale JWT attempts. Owner-column guards also block trusted AI/coach writes for deleting accounts. Storage inserts require an active account. A 15-minute drain grace exceeds upload reservation lifetime.

The trusted cleanup worker claims a bounded lease, reads at most 100 exact owner-prefixed private paths, removes bytes through the Storage API, and checks that no owner/prefix objects remain before calling Auth admin deletion. Auth foreign keys cascade owned logs, insights, notifications, profiles and coaching relationships/notes; retained client workout snapshots follow existing FK semantics. Wrong paths/leases or Storage errors fail closed. More objects are processed on later passes; failed leases expire for recovery. Database metadata is never deleted in place of Storage bytes.

The existing protected food-photo cleanup endpoint now processes one account deletion concurrently with its food batch. `scripts/delete-accounts.mjs` is the trusted manual runner. No scheduler is enabled by migrations. Remote operational completion therefore requires an approved worker cadence/operator; the Preview receipt explicitly says so. Queue failures must be monitored, not silently dropped. A cloud backup may retain deleted information until its approved retention expires.

Local real Auth/Storage E2E verifies confirmation, repeated request, refresh revocation, write freeze, byte deletion, Auth/data cascade, other-owner isolation and rerun. Six worker tests cover Storage failure, cross-owner path, pending batches, already missing objects and bounded claims.

## Storage quotas

Conservative maximum-size reservations bound progress to 50 objects/500 MiB and temporary food photos to 10 objects/100 MiB per account, including inflight reservations. Existing bucket limits remain 10 MiB/object. SQL locks serialize slot claims; actual objects and reservations are unioned so bytes still count after reservations expire. Progress Storage RLS rejects direct uploads without an active reservation; food uploads reserve in the trusted server path. Failed reservations expire after ten minutes. Existing objects are not deleted to satisfy the new quota; over-quota accounts must remove objects before adding more.

65 simultaneous progress reservations allow exactly 50. Cross-user paths, traversal, missing reservation, both bucket budgets and account-deletion freezes are tested. Lower product entitlement limits remain separate.

## Backup evidence and limitations

Read-only staging backup API returned seven COMPLETED physical backups dated September 8–14, 2026. `pitr_enabled=false`; WAL-G enabled. This proves the observed backup list, not a contractual retention SLA or organization billing tier (not exposed by the available organization listing). Confirm subscription/retention in Dashboard before launch.

A local disposable logical-schema dump and separate private JPEG export were made, both originals deleted, then restored; row value and SHA-256 byte comparison passed. Temporary exports and fixtures were removed. This is not a full Auth/roles/cloud physical restore rehearsal. Database backups do not include Storage bytes.

Cloud restore rehearsal remains BLOCKED on an approved isolated destination/account action. Operator procedure: Dashboard staging project → Database Backups, record plan/retention/PITR state, select a completed backup, restore/clone into a separately approved non-production project (never overwrite staging), keep workers/email/AI disabled, restore separately exported Storage bytes, compare inventories/checksums/RLS/roles and Auth recovery, record elapsed RTO and recovery point. Do not invoke in-place PITR merely to obtain evidence.

Storage backup procedure: trusted bounded enumeration of bucket/path/version metadata, download bytes to an encrypted access-controlled backup destination, record SHA-256 and manifest, verify every download, and restore using Storage API. Encryption destination, retention policy, automation and restore ownership still need approval/configuration; local rehearsal is not an operational cloud backup.

## Auth configuration audit

Actual staging config diff shows email confirmations enabled, email max-frequency one minute, OTP length eight and TOTP enrollment/verification enabled. Site URL and explicit web callback/recovery URLs still refer to Sprint8 Preview, plus localhost/mobile callbacks. Recommend replacing stale staging web entries with the approved current stable Preview alias and exact callback/recovery paths; Production will require its own canonical origin. No remote Auth changes made.

Leaked-password protection was previously reported disabled by the advisor: enable before launch with approval and supported plan. Recommend a minimum 12-character password policy, refresh-token rotation/reuse detection enabled, secure email/password changes requiring reauthentication, bounded sessions appropriate to health data and verified reset email delivery. Exact current minimum length/JWT/session/CAPTCHA settings are not established by the diff response; confirm these in Dashboard rather than claim defaults are enabled. No remote policy updates authorized here.

## Remaining QA

Navigation manual acceptance remains valid for the prior Preview. Final local mature-account run: dashboard68ms, progress63ms, training64ms; all eleven routes200 and cache isolation10/10. The historical weight error did not reproduce; sanitized diagnostics remain. Treat as monitored/non-blocking without evidence of an active defect.

Weekly/food schema, safety, grounding, section eligibility and idempotency mocks remain in the current-framework suite. No paid provider call performed. Browser automation cannot read the authenticated Chrome contents; real 390px/tablet/desktop, keyboard/focus, screen-reader and Firefox/WebKit visual checks remain manual. New forms use labels, textual pending/errors and explicit confirmation; source/DOM review does not prove visual accessibility.

Three additive migrations bring branch/local inventory to29. Clean reset, full DB suite580, workspace348 (web262/shared86), schema lint and lint/typecheck/build pass. Real Storage10, photo concurrency3, retention8, notification concurrency7, replay concurrency10, quota concurrency2, deletion E2E12 and restore4 passed. Final staging/Preview outcomes are recorded in the delivery report after deployment.
