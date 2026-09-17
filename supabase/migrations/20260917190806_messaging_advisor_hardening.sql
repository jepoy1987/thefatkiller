-- Private messaging internals are not part of the client-facing Data API.
-- Authenticated retains schema lookup because existing invoker/RLS paths call
-- private authorization helpers; USAGE alone grants no object access.
revoke all on schema private from public, anon;
revoke create on schema private from authenticated, service_role;
grant usage on schema private to authenticated, service_role;

revoke all on private.conversation_ai_setting_events,
  private.ai_generation_audits,
  private.ai_generation_inputs,
  private.messaging_account_deletion_context
  from public, anon, authenticated;

revoke all on sequence private.conversation_ai_setting_events_id_seq
  from public, anon, authenticated;
