# Sprint 10 deterministic section eligibility

Root cause: exact evidence grounding established that a score was correct, but did not establish that the fact belonged under Wins. A real saved Preview response therefore presented a score of zero as a positive observation.

The server pipeline now applies schema validation → safety → grounding → section eligibility → persistence. Each application-generated fact carries eligibility computed from its referenced snapshot metric. A proposed Win must match both category and exact evidence of an eligible fact. Eligibility is never inferred from model prose, and a positive metric cannot qualify another metric in the same category.

## Rules

- Nutrition logging, configured nutrition target adherence, hydration logging/target attainment, daily check-ins: at least 5 of 7 dates. Five is a substantial majority (71.4%) of the calendar window; one nonzero day is insufficient. Target claims also require a configured positive target and cannot exceed logged days.
- Habits: at least 5 eligible opportunities and at least 80% completed. The ratio uses counts directly, not rounded completion_pct; completed cannot exceed opportunities. The minimum prevents a single completion from being presented as weekly consistency.
- Scheduled workouts: positive assignment count and every assignment completed. Total completed workouts can qualify as completed actions when completed count and completed-day count are positive and consistent; this makes no adherence/intensity claim.
- Weekly check-ins: all eligible overlapping weeks completed, with at least one eligible week.
- Coaching: at least one visible goal actually completed; active goals alone do not qualify.
- Scores and all weight movement remain neutral and are never Wins. Missing/unavailable facts and zero activity cannot qualify.
- Watch items may retain grounded low metrics. Focus reasons/titles retain existing grounding rules. Data gaps must still exactly match the deterministic gap list. Empty Wins is valid.

These are product presentation rules, not clinical targets or changes to canonical scoring. The provider receives eligible_win_facts and explicit instructions to choose only that list. Server enforcement remains authoritative.

## Failure behavior

Section validation occurs before assigning the result passed to persistence. Rejection uses existing invalid_output, null result and failed state; it cannot produce completed UI content or create food logs. Existing explicit retry/lease/budget/idempotency rules remain unchanged. Logs contain only safe metadata. No raw rejected output is logged.

No migration is needed. Existing applied SQL and the prior saved QA insight are unchanged. The old saved result is not silently rewritten or regenerated; new-output regression QA uses deterministic stubs without a paid call.

## Verification

- 32 new focused section tests pass, including every requested case, threshold boundaries, cross-category/metric mismatch, all-field server rejection, safe retry and reload, and provider eligible-fact input.
- All 86 weekly tests pass, retaining existing safety and grounding attacks.
- App/shared: 328/328 (web 242; shared 86).
- Full local DB/security: 543/543.
- Existing food-photo safety: 33/33 within full tests.
- Lint/typecheck/test/build/git diff --check: passed; local schema lint clean.
- No paid AI call, staging mutation, Production work, merge, or hardening started.

Checkpoint: READY_FOR_FINAL_QA after the updated Preview is ready. PR #12 must remain draft/unmerged pending final QA.
