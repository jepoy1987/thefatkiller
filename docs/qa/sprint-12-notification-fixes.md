# Sprint 12 notification cap and candidate fixes

This follow-up resolves the two findings from pre-merge QA at `e8d9d60c6a470d0b7b18f0060e216e5798ea4948`. PR #14 must remain unmerged.

## P1: rolling quota and transaction ordering

The old worker captured `now()` (transaction start), and quota accounting excluded rows newer than that timestamp. A prestarted transaction could run after another worker committed twenty rows, exclude those rows, and insert a twenty-first.

The new generator locks the user's preference row first, then obtains `clock_timestamp()`. It counts all notifications newer than that operational time minus 24 hours, without an upper bound. Future/newer stored timestamps therefore consume quota rather than allowing generation. Inserts and their 48-hour expiry use operational time. The lock remains held until transaction end; a READ COMMITTED waiter sees the preceding holder's committed rows. The unique owner/dedupe key remains a second safeguard, and the in-memory quota increments only after an actual insert.

The public worker refreshes its run timestamp after the global advisory lock and passes null logical time so each user refreshes eligibility time after its own lock. Private privileged SQL retains injectable time for eligibility tests only; it cannot move the quota window or backdate generated rows. REPEATABLE READ and SERIALIZABLE generation raise an error rather than trusting a fixed snapshot. The public worker catches per-user failures atomically and records error counts; it does not generate on quota errors.

PostgreSQL documents the distinction between transaction time and wall-clock time in [date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html), and snapshot behavior under [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

## P2: workout candidate ordering

The old query bounded candidates before removing already-notified assignments. The new order is: eligible assigned workouts and permitted active relationship → exclude existing `(user_id, 'workout:' || assignment_id)` → order by effective due time and assignment ID → limit 20. Existing status, lead-time and entitlement checks are unchanged. The unique dedupe index supports the exclusion.

## Verification

- Clean local reset using the final migration inventory: passed.
- Full local pgTAP DB/security suite: **420/420** (original 400 + previous adversarial 7 + focused fixes 13).
- Real multi-connection local integration tests: **7/7**, via `python3 scripts/test-notification-concurrency.py`.
- Cases include exact twenty/21st suppression; four concurrent private workers; prestarted transaction after newer public worker commit; observed row-lock waiter; overlapping exact cron/manual public entrypoints; timezone/logical-date changes; and fixed-snapshot rejection.
- Workout cases include 20 notified + one new, 30 notified + one new, 25 new bounded to twenty, deterministic due/ID ordering, replay and concurrent idempotency. Baseline covers completed/skipped/archived exclusions.
- The previous adversarial suite is **7/7** locally and on staging. Its fixture now explicitly ages stored notification timestamps by 25 hours; advancing logical eligibility time alone intentionally cannot age the operational quota. The original cap assertion similarly seeds current operational timestamps. Assertions were retained.
- App/shared **175/175**: web 89, validation 47, API 19, scoring 14, access 6.
- Fresh lint, typecheck and build passed; `git diff --check` passed. Local and staging public/private schema lint returned no errors.
- Staging rollback verification **80/80**: notification security/category suite 60, adversarial 7, fixes 13. True cross-connection committed-fixture races ran locally; staging reproduction assertions stayed within rollback transactions.

## Migration and preservation

Added only `20260914155651_sprint_12_notification_cap_and_candidates.sql`. Supabase assigned this version on application; the new uncommitted local file was aligned to it and validated with another clean local reset. No already-applied migration file or remote history was repaired, marked or reverted. The migration replaces three functions and preserves grants, tables, identities and existing data. It has no Sprint 10 dependency and activates no scheduler.

Inventory: main **19**, branch/local **21**, staging **22**. All branch versions are present on staging; the sole extra remains paused Sprint 10 `20260914123542_sprint_10_weekly_insights.sql`.

All **24** staging data fingerprints matched before/after. Final staging counts: notifications 0, preferences 0, worker runs 0; `cron.job` absent. Local concurrency fixtures were deleted. Exactly one local job was restored after reset: `tfk-local-reminders`, `*/15 * * * *`, `select public.generate_due_notifications();`.

Security grants remain minimal; normal users cannot invoke generation. Preexisting advisor notices include intentionally callable authenticated RPCs, deny-all private RLS tables, the platform `rls_auto_enable` event trigger, and disabled leaked-password protection. No new generator exposure was introduced. Reference: [Supabase advisor descriptions](https://supabase.com/docs/guides/database/database-linter) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Sprint 10 local/remote remain at `174a58c755b539c1101bcd801461e51debac997d`; no Sprint 10 modifications. Production was not accessed or verified, no Production credentials/scheduler were changed, and no Sprint 13 work was started. Preview verification must target the pushed fix commit; its final URL/HEAD and PR checkpoint are recorded in the completion report.
