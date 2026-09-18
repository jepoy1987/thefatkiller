# Messaging advisor hardening

Reviewed 2026-09-18 against staging project `nxppfepdgvevlmthzacc` after
`20260916155757_messaging_foundation.sql`. This record does not authorize or
perform a remote migration.

## Foreign-key advisor review

Supabase performance advisor `0001_unindexed_foreign_keys` reports the same
four INFO findings both locally and on staging. An earlier local-versus-staging
discrepancy was caused by running the advisor with a severity filter that
excluded INFO; it was not evidence that the findings had been remediated.

Catalog inspection found each parent-side lookup already supported by a valid,
ready, non-partial B-tree. The leading identifier is globally unique, or leads
a key whose remaining column provides per-parent cardinality. Adding the exact
composite shape suggested by this syntactic advisor would duplicate the lookup
path and increase write cost.

| Constraint | Referencing columns | Referenced columns | Existing usable index | Classification |
| --- | --- | --- | --- | --- |
| `ai_generation_audits_generated_message_id_conversation_id_fkey` | `private.ai_generation_audits(generated_message_id, conversation_id)` | `public.messages(id, conversation_id)` | unique `ai_generation_audits_generated_message_id_key(generated_message_id)` | Advisor limitation: a generated message belongs to one conversation. |
| `ai_generation_inputs_generation_id_conversation_id_fkey` | `private.ai_generation_inputs(generation_id, conversation_id)` | `private.ai_generation_audits(id, conversation_id)` | primary key `ai_generation_inputs_pkey(generation_id, message_id)` and unique `ai_generation_inputs_generation_id_input_order_key(generation_id, input_order)` | Advisor limitation: generation ID identifies one audit/conversation and both indexes support generation-scoped scans. |
| `ai_generation_inputs_message_id_conversation_id_fkey` | `private.ai_generation_inputs(message_id, conversation_id)` | `public.messages(id, conversation_id)` | `ai_generation_inputs_message_idx(message_id)` | Advisor limitation: message ID globally identifies its conversation. |
| `message_receipts_message_id_conversation_id_fkey` | `public.message_receipts(message_id, conversation_id)` | `public.messages(id, conversation_id)` | primary key `message_receipts_pkey(message_id, user_id)` | Advisor limitation: the primary-key prefix finds every receipt for one globally unique message. |

All four constraints use `ON UPDATE NO ACTION`. Delete actions are respectively
`SET NULL (generated_message_id)`, `CASCADE`, `RESTRICT`, and `CASCADE`. No
index is added. The targeted catalog test verifies index method, ordered key
columns, uniqueness/primary status, validity, readiness, predicates and
expressions. It also rejects structurally duplicate indexes regardless of
their names and rejects the four advisor-shaped composites under any name.

The complete relevant index inventory is:

- `private.ai_generation_audits`: primary key `(id)`; unique
  `(generated_message_id)`; unique `(id, conversation_id)`; B-tree
  `(conversation_id, requested_at DESC)`; partial B-tree `(reviewer_user_id)`
  where `reviewer_user_id IS NOT NULL`.
- `private.ai_generation_inputs`: primary key `(generation_id, message_id)`;
  unique `(generation_id, input_order)`; B-tree `(message_id)`; B-tree
  `(conversation_id, generation_id)`.
- `public.message_receipts`: primary key `(message_id, user_id)`; B-tree
  `(conversation_id, user_id)`; B-tree `(user_id, read_at DESC)`.

This conclusion must be revisited if identifier uniqueness is removed, FK
column order or actions change, an index becomes invalid/not-ready/partial or
expression-based, generation/message cardinality changes, representative
`EXPLAIN` plans regress as data grows, or the advisor begins using semantic
rather than exact-column matching.

## Security posture

`0008_rls_enabled_no_policy` remains expected for these deny-by-default tables:

- `private.ai_generation_audits`
- `private.ai_generation_inputs`
- `private.conversation_ai_setting_events`
- `private.messaging_account_deletion_context`

They remain RLS-enabled and policy-free. `PUBLIC`, `anon`, `authenticated`, and
`authenticator` have no privileges on the four tables or the identity sequence.
`authenticated` retains schema `USAGE`, but not `CREATE`, because established
invoker/RLS paths resolve private authorization helpers; schema lookup alone
does not grant object access. `anon`, `authenticator`, and `service_role` have
neither `USAGE` nor `CREATE` on `private`. The foundation's six direct
`service_role` table privileges therefore remain deliberately dormant. A later
AI rollout must explicitly grant only the schema access it needs in a separate
migration. PostgreSQL owner `postgres` retains owner rights.

The public messaging RPC boundary is explicit and environment-independent:
only `authenticated` and owner `postgres` can execute
`get_or_create_conversation(uuid)` and `send_message(uuid,text)`. Account
deletion remains callable by `service_role` and owner only. Private helper
execution is also asserted role by role.

This exception becomes invalid if `private` is exposed through the Data API, a
client role gains AI object privileges, `service_role` gains schema `USAGE`
without a separately reviewed AI migration, an unrestricted public RPC exposes
private rows, table RLS is disabled, or an unexpected policy is added.

`0029_authenticated_security_definer_function_executable` remains a reviewed
architectural exception for exactly:

- `public.get_or_create_conversation(p_relationship_id uuid)`
- `public.send_message(p_conversation_id uuid, p_body text)`

Definer rights are necessary because authenticated callers have no direct
conversation/message write privileges. Both functions are owned by `postgres`,
are volatile PL/pgSQL `SECURITY DEFINER` functions with an empty fixed search
path, accept no caller-supplied identity/origin/participant/role, derive the
actor from `auth.uid()`, validate current relationship/participant and deletion
state, and hold the required relationship lock across writes. Tests cover null
identity, outsiders, stale roles, deletion queues, direct writes, forbidden
AI/system origins, and committed two-session state-change races.

This exception becomes invalid if a signature, owner, language, volatility,
security mode, search path, return type, or EXECUTE grant changes; caller
identity/role/origin becomes accepted; authoritative state checks or locking
are removed; direct table writes broaden; or AI/system origins become
insertable.

The foundation migration SHA-256 remains
`2349113619728daf2ac089decedbbe89b9b4162c91efa0d7112ab0f9e4e8d6da`.

## Verification

- Clean local migration replay succeeded through this hardening migration.
- Focused messaging/foundation/deletion suites: 127 assertions passed; the
  hardening file contributes 29 exact catalog and behavior assertions.
- Full database suite: 27 files and 718 assertions passed.
- Committed-fixture concurrency test: all three two-session relationship-lock
  scenarios passed; a subsequent clean reset removed the fixtures.
- Schema lint reported no errors or warnings. Repository lint, typecheck, unit
  tests, and production builds passed.
- Source integrity passed under normal Python and `python -O`. Linked staging
  type generation differed from the tracked public types only by the generator's
  `__InternalSupabase.PostgrestVersion` metadata block.

The read-only staging advisor baseline remains unchanged because this migration
has not been applied there: security reports 11 INFO policy-free RLS tables,
one pre-existing anonymous definer warning, and 25 authenticated-definer
warnings (including the two reviewed messaging RPCs). Performance reports 11
INFO unindexed-FK findings (including all four reviewed messaging FKs), seven
pre-existing RLS init-plan warnings, 12 unused-index INFO findings, and one Auth
connection-strategy INFO finding. No claim is made that this PR removes those
reviewed or pre-existing notices.
