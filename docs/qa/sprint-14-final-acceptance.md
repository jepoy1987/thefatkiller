# Sprint 14 final acceptance

Decision: `READY_TO_MERGE_WITH_PRODUCTION_PREREQUISITES`

Recorded 2026-09-15 for PR #16 at application HEAD
`b10183bb82f4d29197e6220d70157a16f8ed0761`. This record authorizes neither a
merge nor any Production change.

## Objective evidence

- Owner authenticated manual QA: passed. Important authenticated flows were
  personally verified, and the original two-to-three-second navigation issue
  is materially resolved.
- Workspace: lint 10/10, typecheck 10/10, tests 359/359, builds 2/2, and
  `git diff --check` passed.
- Database/security: 591/591; schema lint returned no errors. Database advisors
  returned no error-level finding. Seven known RLS init-plan performance
  warnings remain optimization opportunities, not security failures.
- Focused Auth, navigation, AI Food Photo and AI Weekly Insights regressions:
  170/170.
- Replay protection 10/10; account deletion 14/14; Storage quota concurrency
  2/2; notification concurrency 7/7; report concurrency 3/3; real Storage
  10/10; food-photo concurrency 3/3; retention 8/8; cleanup endpoint/scheduler
  2/2.
- Backup/export verification passed manifest/alert/retention 8/8, database
  Storage inventory 9/9 and local restore rehearsal 15/15. Missing, corrupted,
  unexpected, expired and owner/path-mismatch cases were detected.
- The final local authenticated benchmark returned 200 for all eleven routes,
  with 58–77 ms medians and cross-account cache isolation 10/10. Streaming
  loading and immediate navigation feedback regressions pass.
- Staging Auth remains configured with the exact Sprint 14 Preview Site URL,
  five-entry non-wildcard redirect allow-list, 12-character lower/upper/number/
  symbol password policy and leaked-password protection. Existing rate limits
  were not changed.
- The owner confirms the previous bounded staging scheduler soak passed. The
  recorded post-soak fingerprints match baseline, and current staging has no
  installed Cron job (recorded configured 0/active 0). Remote schedulers remain
  disabled.
- The current Preview was Ready. Its inspected deployment-log window showed
  zero warnings, errors or fatals and no relevant 5xx. Production was not
  inspected through authenticated routes or changed.
- Tracked environment templates contain no credentials, and a tracked-file
  signature/pattern scan found no suspected provider or service-role secret.

## A. Merge blockers

None found. There is no unresolved P0/P1 application, data-isolation or
security defect in the tested Sprint 14 scope.

## B. Production activation prerequisites

- Explicitly authorize and create/configure the dedicated Production Supabase
  environment, migrate it with jobs disabled, and verify its fingerprints.
- Configure Production Auth only for `https://app.thefatkiller.com` and its two
  exact callbacks; verify recovery and redirect behavior without wildcard or
  role/plan grants.
- Configure approved Production-only credentials, budgets and runtime region;
  verify the intended release deployment, domain, rollback target and
  authenticated smoke before real-user activation.
- Establish or explicitly accept the open backup, restore, scheduler,
  account-deletion-worker, alerting and monitoring risks listed below. Supabase
  database backup alone does not protect Storage object bytes.
- Complete commercial Stripe decisions before enabling paid checkout; current
  database-controlled entitlements do not prove live billing readiness.
- Resolve or separately accept the repository's Expo/mobile transitive
  dependency advisories before a native mobile release. Web/website production
  dependency paths have no remaining Next/React/sharp advisory.

## C. Accepted/deferred risks

The owner explicitly deferred these from the Sprint 14 merge decision. They
remain visible launch risks and are not claimed complete:

- external encrypted Storage backup destination;
- hourly Storage backup schedule/RPO;
- proven four-hour recovery target;
- cloud restore rehearsal;
- backup, notification-scheduler and food-cleanup alert destination/delivery;
- independent monitoring;
- Firefox testing;
- exhaustive screen-reader coverage; and
- native mobile recovery on a physical device.

The proposed Storage RPO is hourly and the recovery target is four hours;
neither is achieved or proven. `CLOUD_RESTORE_MANUAL_STEP_REQUIRED` remains in
force. No Production configuration, scheduler activation, cloud restore, paid
AI request or merge was performed for this acceptance.
