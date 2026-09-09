# Sprint 8 scoring and adherence semantics

The Sprint 5 `calculateTFKScore` remains canonical: nutrition 30, hydration 15,
habits 30, check-ins 15, and progress logging 10. Its formula is unchanged.
Client accountability/Today and coach surfaces consume the same seven daily
aggregates from `private.accountability_score_input`. The owner RPC derives its
user from `auth.uid()`; the coach RPC retains role, entitlement and relationship
checks. There is no arbitrary-user public scoring RPC.

The window is client-local today minus six through today. Each local date is
converted to its own midnight timestamp bounds (including 23/25-hour DST days).
Future timestamped entries are excluded. Zero-activity dates remain in the input.

Daily habit opportunities begin on the habit's local creation date, with at most
one completion per habit/date. An older daily habit completed once in the window
has 1/7 = 14.29% adherence. Inactive habits are excluded from the active-habit
metric for the entire window, consistently on both surfaces. The current schema
has no activation history, so historical activity before deactivation is not
inferred from `updated_at`. Deactivation therefore changes the active-habit
cohort, not a historical adherence record.

Weekly habits are not daily TFK Score opportunities. Their separate displayed
rate measures distinct completed dates against `target_per_period` per rolling
seven local days, capped at 100%. For creation mid-window, the target is prorated
by eligible days and rounded up. This does not invent opportunities before
creation; it also does not claim a daily streak for a weekly habit.

A coach receives canonical score inputs only when progress, nutrition and
accountability summaries are all shared. Otherwise the TFK Score is unavailable,
never zero or a renormalized partial score. Typed availability accompanies each
summary. Attention flags consider only available categories. GLP-1 consent has
no effect on TFK Score and remains opt-in; photos and private notes are never
score inputs.
