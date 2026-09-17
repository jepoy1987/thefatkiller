begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,private,extensions,auth;
select no_plan();

-- Private AI storage stays outside the client namespace. service_role retains
-- only the explicit server-side access granted by the foundation migration.
select ok(not has_schema_privilege('anon','private','usage'),'anon cannot use private schema');
select ok(has_schema_privilege('authenticated','private','usage'),
  'authenticated retains namespace lookup for existing private helpers');
select ok(not has_schema_privilege('authenticated','private','create'),
  'authenticated cannot create private objects');
select ok(has_schema_privilege('service_role','private','usage'),'service_role can use private schema');
select is((
  select count(*)::int from information_schema.role_table_grants
  where grantee in ('anon','authenticated') and table_schema='private'
    and table_name in ('conversation_ai_setting_events','ai_generation_audits',
      'ai_generation_inputs','messaging_account_deletion_context')
),0,'client roles have no private messaging table grants');
select is((
  select count(*)::int from information_schema.role_usage_grants
  where grantee in ('anon','authenticated') and object_schema='private'
    and object_name='conversation_ai_setting_events_id_seq'
),0,'client roles have no private messaging sequence grants');
select is((
  select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='private'
    and c.relname in ('conversation_ai_setting_events','ai_generation_audits',
      'ai_generation_inputs','messaging_account_deletion_context')
    and c.relrowsecurity
),4,'all private messaging tables retain RLS');

set local role anon;
select throws_ok($$select * from private.ai_generation_audits$$,'42501',null,
  'anon cannot resolve private AI audit storage');
reset role;
set local role authenticated;
select throws_ok($$select * from private.ai_generation_audits$$,'42501',null,
  'authenticated cannot read private AI audit storage');
reset role;

-- The two public RPCs remain narrow, authenticated-only definer boundaries.
select ok(not has_function_privilege('public','public.get_or_create_conversation(uuid)','execute'),
  'PUBLIC cannot execute conversation creation');
select ok(not has_function_privilege('anon','public.get_or_create_conversation(uuid)','execute'),
  'anon cannot execute conversation creation');
select ok(has_function_privilege('authenticated','public.get_or_create_conversation(uuid)','execute'),
  'authenticated can execute conversation creation');
select ok(not has_function_privilege('public','public.send_message(uuid,text)','execute'),
  'PUBLIC cannot execute message sending');
select ok(not has_function_privilege('anon','public.send_message(uuid,text)','execute'),
  'anon cannot execute message sending');
select ok(has_function_privilege('authenticated','public.send_message(uuid,text)','execute'),
  'authenticated can execute message sending');
select is((select pg_get_function_identity_arguments(oid) from pg_proc
  where oid='public.get_or_create_conversation(uuid)'::regprocedure),
  'p_relationship_id uuid','conversation RPC accepts only relationship identity');
select is((select pg_get_function_identity_arguments(oid) from pg_proc
  where oid='public.send_message(uuid,text)'::regprocedure),
  'p_conversation_id uuid, p_body text','send RPC accepts no caller identity or origin');
select ok((select prosecdef from pg_proc where oid='public.get_or_create_conversation(uuid)'::regprocedure),
  'conversation RPC remains SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid='public.send_message(uuid,text)'::regprocedure),
  'send RPC remains SECURITY DEFINER');
select is((select proconfig from pg_proc where oid='public.get_or_create_conversation(uuid)'::regprocedure),
  array['search_path=""'],'conversation RPC has an empty search path');
select is((select proconfig from pg_proc where oid='public.send_message(uuid,text)'::regprocedure),
  array['search_path=""'],'send RPC has an empty search path');
select ok((select pg_get_functiondef(oid) ilike '%auth.uid()%' and pg_get_functiondef(oid) ilike '%for share%'
  and pg_get_functiondef(oid) ilike '%private.account_deletions%'
  from pg_proc where oid='public.get_or_create_conversation(uuid)'::regprocedure),
  'conversation RPC derives identity, locks relationship, and checks deletion state');
select ok((select pg_get_functiondef(oid) ilike '%auth.uid()%' and pg_get_functiondef(oid) ilike '%for share%'
  and pg_get_functiondef(oid) ilike '%private.account_deletions%'
  and pg_get_functiondef(oid) ilike '%actor_role::text::public.message_origin%'
  from pg_proc where oid='public.send_message(uuid,text)'::regprocedure),
  'send RPC derives identity and origin, locks relationship, and checks deletion state');
select ok(not has_table_privilege('authenticated','public.messages','insert,update,delete'),
  'authenticated retains no direct message mutation privilege');

set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.get_or_create_conversation(gen_random_uuid())$$,'42501',
  'Authentication required','null auth.uid fails conversation RPC');
select throws_ok($$select public.send_message(gen_random_uuid(),'no actor')$$,'42501',
  'Authentication required','null auth.uid fails send RPC');
reset role;

-- The advisor requires every composite column in the index. These four keys
-- already have selective leading-column indexes; adding exact duplicates would
-- only increase write cost.
select has_index('private','ai_generation_audits','ai_generation_audits_generated_message_id_key',
  'AI audit generated-message lookup uses the existing unique index');
select has_index('private','ai_generation_inputs','ai_generation_inputs_pkey',
  'AI input generation lookup uses the existing primary-key prefix');
select has_index('private','ai_generation_inputs','ai_generation_inputs_message_idx',
  'AI input message lookup uses the existing message index');
select has_index('public','message_receipts','message_receipts_pkey',
  'receipt message lookup uses the existing primary-key prefix');
select is((select count(*)::int from pg_indexes where indexname in (
  'ai_generation_audits_generated_message_conversation_idx',
  'ai_generation_inputs_generation_conversation_idx',
  'ai_generation_inputs_message_conversation_idx',
  'message_receipts_message_conversation_idx'
)),0,'no redundant advisor-only composite indexes exist');

select ok((select pg_get_constraintdef(oid) ilike '%mode = ''off''%'
  from pg_constraint where conname='conversation_ai_phase_a_off'),
  'AI mode remains constrained to off');
select ok((select pg_get_constraintdef(oid) ilike '%client%coach%'
  from pg_constraint where conname='messages_phase_a_human_only'),
  'AI and system message origins remain prohibited');

select * from finish();
rollback;
