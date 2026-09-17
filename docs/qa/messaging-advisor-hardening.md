# Messaging advisor hardening

Reviewed 2026-09-18 against staging project `nxppfepdgvevlmthzacc` after
`20260916155757_messaging_foundation.sql`. This record does not authorize or
perform a remote migration.

## Foreign-key advisor review

Supabase performance lint `0001_unindexed_foreign_keys` reported four
composite foreign keys. Catalog inspection found each parent-side lookup is
already supported by a valid, ready, non-partial B-tree whose leading column
is selective; the second column is determined by the globally unique message
or generation identifier. Adding the advisor's exact composite shape would
duplicate the lookup path and add write cost.

| Constraint | Referencing columns | Referenced columns | Existing usable index | Classification |
| --- | --- | --- | --- | --- |
| `ai_generation_audits_generated_message_id_conversation_id_fkey` | `private.ai_generation_audits(generated_message_id, conversation_id)` | `public.messages(id, conversation_id)` | unique `ai_generation_audits_generated_message_id_key(generated_message_id)` | Advisor limitation; `messages.id` and `generated_message_id` are globally unique. |
| `ai_generation_inputs_generation_id_conversation_id_fkey` | `private.ai_generation_inputs(generation_id, conversation_id)` | `private.ai_generation_audits(id, conversation_id)` | primary key `ai_generation_inputs_pkey(generation_id, message_id)` and unique `ai_generation_inputs_generation_id_input_order_key(generation_id, input_order)` | Advisor limitation; both lead with generation ID, which identifies one audit/conversation. |
| `ai_generation_inputs_message_id_conversation_id_fkey` | `private.ai_generation_inputs(message_id, conversation_id)` | `public.messages(id, conversation_id)` | `ai_generation_inputs_message_idx(message_id)` | Advisor limitation; `messages.id` globally identifies the conversation. |
| `message_receipts_message_id_conversation_id_fkey` | `public.message_receipts(message_id, conversation_id)` | `public.messages(id, conversation_id)` | primary key `message_receipts_pkey(message_id, user_id)` | Advisor limitation; the primary-key prefix finds all receipts for the globally unique message. |

All four constraints use `ON UPDATE NO ACTION`. Delete actions are respectively
`SET NULL (generated_message_id)`, `CASCADE`, `RESTRICT`, and `CASCADE`. No
index is added. The targeted database test asserts the supporting indexes and
that no exact advisor-only duplicates appear.

For completeness, catalog inspection found these indexes on the three
referencing tables (columns are in index order):

- `private.ai_generation_audits`: primary key `(id)`; unique
  `(generated_message_id)`; unique `(id, conversation_id)`; B-tree
  `(conversation_id, requested_at DESC)`; partial B-tree `(reviewer_user_id)`
  where `reviewer_user_id IS NOT NULL`.
- `private.ai_generation_inputs`: primary key `(generation_id, message_id)`;
  unique `(generation_id, input_order)`; B-tree `(message_id)`; B-tree
  `(conversation_id, generation_id)`.
- `public.message_receipts`: primary key `(message_id, user_id)`; B-tree
  `(conversation_id, user_id)`; B-tree `(user_id, read_at DESC)`.

The supporting indexes identified in the table are valid, ready, non-partial
B-trees. Their leading globally unique identifier supports the child-row scan
needed for parent delete/update checks; the partial reviewer index is unrelated.

## Reviewed security-advisor exceptions

`0008_rls_enabled_no_policy` remains expected for these deny-by-default tables:

- `private.ai_generation_audits`
- `private.ai_generation_inputs`
- `private.conversation_ai_setting_events`
- `private.messaging_account_deletion_context`

They remain RLS-enabled without artificial policies. The follow-up migration
reasserts that `PUBLIC`, `anon`, and `authenticated` have no AI table or
identity-sequence privileges and cannot create private objects. `authenticated`
retains `USAGE` on the namespace because pre-existing public invoker functions
and RLS policies resolve established private authorization/training helpers;
the full database suite proves removing that lookup privilege breaks those
paths. Schema `USAGE` grants no table, sequence, or function privilege by
itself, and `private` is not an exposed Data API schema. No public RPC exposes
unrestricted AI storage. This exception becomes invalid if `private` is added
to the Data API exposed schemas, a client role receives AI object privileges,
a public RPC returns unrestricted rows, or RLS is disabled.

`0029_authenticated_security_definer_function_executable` remains a reviewed
architectural exception for exactly:

- `public.get_or_create_conversation(p_relationship_id uuid)`
- `public.send_message(p_conversation_id uuid, p_body text)`

Definer rights are necessary because authenticated callers have no direct
conversation/message write privileges. Both functions have an empty fixed
search path, revoke `PUBLIC` and `anon`, accept no caller-supplied identity,
origin, participant, or role, derive the actor from `auth.uid()`, validate live
relationship/participant state, check queued account deletion, and hold a
relationship row lock across the write. Existing and targeted tests cover null
identity, outsiders, unrelated/previous coaches, administrators, paused/ended/
reassigned relationships, deletion queues, spoofed origins, direct writes,
and two-session state-change races.

The RPC exception becomes invalid if either signature expands to accept caller
identity/role/origin, its search path is no longer empty, execution broadens,
direct table writes are granted, authoritative state checks or relationship
locking are removed, or AI/system origins become insertable.

The foundation migration SHA-256 remains
`2349113619728daf2ac089decedbbe89b9b4162c91efa0d7112ab0f9e4e8d6da`.
