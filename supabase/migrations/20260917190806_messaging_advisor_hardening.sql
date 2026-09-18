-- Private messaging internals are not part of the client-facing Data API.
-- Authenticated retains schema lookup because existing invoker/RLS paths call
-- private authorization helpers; USAGE alone grants no object access.
-- Phase A deliberately leaves service_role object ACLs dormant: a later AI
-- rollout must explicitly grant the minimum schema access in a new migration.
revoke all on schema private from public, anon, service_role, authenticator;
revoke create on schema private from authenticated;
grant usage on schema private to authenticated;

revoke all on private.conversation_ai_setting_events,
  private.ai_generation_audits,
  private.ai_generation_inputs,
  private.messaging_account_deletion_context
  from public, anon, authenticated, authenticator;

revoke all on sequence private.conversation_ai_setting_events_id_seq
  from public, anon, authenticated, service_role, authenticator;

-- Local and hosted Supabase defaults differ for service_role function ACLs.
-- Keep the exposed RPC boundary identical in both environments.
revoke all on function public.get_or_create_conversation(uuid),
  public.send_message(uuid, text)
  from public, anon, service_role, authenticator;
grant execute on function public.get_or_create_conversation(uuid),
  public.send_message(uuid, text)
  to authenticated;
