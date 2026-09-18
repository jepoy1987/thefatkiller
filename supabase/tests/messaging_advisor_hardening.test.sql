begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,private,extensions,auth;
select no_plan();

-- The private schema is only a namespace dependency for authenticated helper
-- calls. Phase A service_role object ACLs remain dormant until a later
-- migration explicitly grants the minimum schema access needed by an AI worker.
with expected(role_name, can_use, can_create) as (values
  ('anon',false,false), ('authenticated',true,false),
  ('service_role',false,false), ('authenticator',false,false),
  ('postgres',true,true)
)
select is(
  (select bool_and(has_schema_privilege(role_name,'private','usage')=can_use
               and has_schema_privilege(role_name,'private','create')=can_create)
   from expected), true,
  'private schema privilege matrix is exact');
with expected(grantee,privilege_type) as (values
  ('authenticated','USAGE'),('postgres','CREATE'),('postgres','USAGE')
), actual as (
  select coalesce(r.rolname,'PUBLIC')::text grantee,a.privilege_type::text
  from pg_namespace n
  cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
  left join pg_roles r on r.oid=a.grantee where n.nspname='private'
), delta as (
  (select * from expected except select * from actual)
  union all (select * from actual except select * from expected)
)
select is((select count(*)::int from delta),0,'private schema direct ACL is exact');

-- Verify all table privileges, including the intentionally dormant direct
-- service_role ACLs inherited from the foundation migration.
with roles(role_name) as (values
  ('anon'),('authenticated'),('service_role'),('authenticator'),('postgres')
), tables(table_name) as (values
  ('conversation_ai_setting_events'),('ai_generation_audits'),
  ('ai_generation_inputs'),('messaging_account_deletion_context')
), privileges(privilege_name) as (values
  ('select'),('insert'),('update'),('delete'),('truncate'),('references'),('trigger')
), expected as (
  select role_name,table_name,privilege_name,
    case
      when role_name='postgres' then true
      when role_name='service_role' and table_name='conversation_ai_setting_events'
        then privilege_name='select'
      when role_name='service_role' and table_name='ai_generation_audits'
        then privilege_name in ('select','insert','update')
      when role_name='service_role' and table_name='ai_generation_inputs'
        then privilege_name in ('select','insert')
      else false
    end as allowed
  from roles cross join tables cross join privileges
)
select is(
  (select bool_and(has_table_privilege(role_name,format('private.%I',table_name),privilege_name)=allowed)
   from expected), true,
  'private messaging table privilege matrix is exact');

select is((
  select count(*)::int
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  left join pg_roles r on r.oid=a.grantee
  where n.nspname='private'
    and c.relname in ('conversation_ai_setting_events','ai_generation_audits',
      'ai_generation_inputs','messaging_account_deletion_context')
    and (a.grantee=0 or r.rolname in ('anon','authenticated','authenticator'))
),0,'private messaging tables have no direct client or authenticator ACLs');

with expected(table_name,privilege_name) as (values
  ('conversation_ai_setting_events','SELECT'),
  ('ai_generation_audits','SELECT'),('ai_generation_audits','INSERT'),
  ('ai_generation_audits','UPDATE'),('ai_generation_inputs','SELECT'),
  ('ai_generation_inputs','INSERT')
), actual as (
  select c.relname::text as table_name, a.privilege_type::text as privilege_name
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  join pg_roles r on r.oid=a.grantee
  where n.nspname='private' and r.rolname='service_role'
    and c.relname in ('conversation_ai_setting_events','ai_generation_audits',
      'ai_generation_inputs','messaging_account_deletion_context')
), delta as (
  (select * from expected except select * from actual)
  union all
  (select * from actual except select * from expected)
)
select is((select count(*)::int from delta),0,
  'service_role retains only the six dormant foundation table ACLs');

with expected(role_name,allowed) as (values
  ('anon',false),('authenticated',false),('service_role',false),
  ('authenticator',false),('postgres',true)
), privileges(privilege_name) as (values ('usage'),('select'),('update'))
select is((select bool_and(
  has_sequence_privilege(role_name,'private.conversation_ai_setting_events_id_seq',privilege_name)=allowed)
  from expected cross join privileges),true,
  'AI event sequence privilege matrix is exact');
with expected(grantee,privilege_type) as (values
  ('postgres','SELECT'),('postgres','UPDATE'),('postgres','USAGE')
), actual as (
  select coalesce(r.rolname,'PUBLIC')::text grantee,a.privilege_type::text
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl,acldefault('S',c.relowner))) a
  left join pg_roles r on r.oid=a.grantee
  where n.nspname='private' and c.relname='conversation_ai_setting_events_id_seq'
), delta as (
  (select * from expected except select * from actual)
  union all (select * from actual except select * from expected)
)
select is((select count(*)::int from delta),0,'AI event sequence direct ACL is exact');

select is((select count(*)::int
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='private'
    and c.relname in ('conversation_ai_setting_events','ai_generation_audits',
      'ai_generation_inputs','messaging_account_deletion_context')
    and c.relrowsecurity and not c.relforcerowsecurity),4,
  'all private messaging tables retain enabled, non-forced RLS');
select is((select count(*)::int from pg_policies
  where schemaname='private' and tablename in (
    'conversation_ai_setting_events','ai_generation_audits',
    'ai_generation_inputs','messaging_account_deletion_context')),0,
  'private messaging tables remain policy-free');

set local role anon;
select throws_ok($$select * from private.ai_generation_audits$$,'42501',null,
  'anon cannot use the private schema');
reset role;
set local role authenticated;
select throws_ok($$select * from private.ai_generation_audits$$,'42501',null,
  'authenticated cannot read private AI audit storage');
reset role;
set local role service_role;
select throws_ok($$select * from private.ai_generation_audits$$,'42501',null,
  'service_role object ACLs remain unusable without private schema USAGE');
select is(public.prepare_account_deletion(gen_random_uuid(),gen_random_uuid()),false,
  'service_role account-deletion RPC remains callable and returns safely for an unknown request');
reset role;

-- Exact function metadata and effective EXECUTE boundaries.
with expected(signature,arguments,return_type) as (values
  ('public.get_or_create_conversation(uuid)'::regprocedure,
    'p_relationship_id uuid','public.conversations'::regtype),
  ('public.send_message(uuid,text)'::regprocedure,
    'p_conversation_id uuid, p_body text','public.messages'::regtype)
)
select is((select count(*)::int from expected e join pg_proc p on p.oid=e.signature
  join pg_roles r on r.oid=p.proowner join pg_language l on l.oid=p.prolang
  where r.rolname<>'postgres' or not p.prosecdef or p.provolatile<>'v'
    or p.proconfig<>array['search_path=""']
    or pg_get_function_identity_arguments(p.oid)<>e.arguments
    or p.prorettype<>e.return_type or l.lanname<>'plpgsql'),0,
  'public messaging RPC metadata is exact');

with roles(role_name) as (values
  ('anon'),('authenticated'),('service_role'),('authenticator'),('postgres')
), functions(signature) as (values
  ('public.get_or_create_conversation(uuid)'),('public.send_message(uuid,text)')
)
select is((select bool_and(has_function_privilege(role_name,signature,'execute')=
  (role_name in ('authenticated','postgres'))) from roles cross join functions),true,
  'public messaging RPC EXECUTE matrix is exact');
select ok(not has_function_privilege('public','public.get_or_create_conversation(uuid)','execute')
  and not has_function_privilege('public','public.send_message(uuid,text)','execute'),
  'PUBLIC cannot execute public messaging RPCs');

with roles(role_name) as (values
  ('anon'),('authenticated'),('service_role'),('authenticator'),('postgres')
)
select is((select bool_and(has_function_privilege(role_name,
  'public.prepare_account_deletion(uuid,uuid)','execute')=
  (role_name in ('service_role','postgres'))) from roles),true,
  'account-deletion RPC EXECUTE matrix is exact');

with expected(signature,role_name,allowed) as (
  select signature,role_name,
    case
      when role_name='postgres' then true
      when signature='private.current_user_is_active_conversation_participant(uuid)'
        and role_name='authenticated' then true
      else false
    end
  from (values
    ('private.current_user_is_active_conversation_participant(uuid)'),
    ('private.messaging_deletion_authorized(uuid)'),
    ('private.guard_messaging_account_state()')) f(signature)
  cross join (values ('anon'),('authenticated'),('service_role'),('authenticator'),('postgres')) r(role_name)
)
select is((select bool_and(has_function_privilege(role_name,signature,'execute')=allowed)
  from expected),true,'private messaging helper EXECUTE matrix is exact');
with expected(signature,grantee,privilege_type) as (values
  ('public.get_or_create_conversation(uuid)'::regprocedure,'authenticated','EXECUTE'),
  ('public.get_or_create_conversation(uuid)'::regprocedure,'postgres','EXECUTE'),
  ('public.send_message(uuid,text)'::regprocedure,'authenticated','EXECUTE'),
  ('public.send_message(uuid,text)'::regprocedure,'postgres','EXECUTE'),
  ('public.prepare_account_deletion(uuid,uuid)'::regprocedure,'service_role','EXECUTE'),
  ('public.prepare_account_deletion(uuid,uuid)'::regprocedure,'postgres','EXECUTE'),
  ('private.current_user_is_active_conversation_participant(uuid)'::regprocedure,'authenticated','EXECUTE'),
  ('private.current_user_is_active_conversation_participant(uuid)'::regprocedure,'postgres','EXECUTE'),
  ('private.messaging_deletion_authorized(uuid)'::regprocedure,'postgres','EXECUTE'),
  ('private.guard_messaging_account_state()'::regprocedure,'postgres','EXECUTE')
), actual as (
  select p.oid::regprocedure signature,coalesce(r.rolname,'PUBLIC')::text grantee,
    a.privilege_type::text
  from pg_proc p
  cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  left join pg_roles r on r.oid=a.grantee
  where p.oid in (select signature from expected)
), delta as (
  (select * from expected except select * from actual)
  union all (select * from actual except select * from expected)
)
select is((select count(*)::int from delta),0,
  'messaging RPC and helper direct EXECUTE ACLs are exact');

set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.get_or_create_conversation(gen_random_uuid())$$,'42501',
  'Authentication required','null auth.uid fails conversation RPC');
select throws_ok($$select public.send_message(gen_random_uuid(),'no actor')$$,'42501',
  'Authentication required','null auth.uid fails send RPC');
select throws_ok($$insert into private.ai_generation_audits(
  id,conversation_id,provider,model_identifier,prompt_version)
  values(gen_random_uuid(),gen_random_uuid(),'x','x','x')$$,
  '42501',null,'authenticated cannot write AI audit storage');
reset role;
-- Bypass unrelated account-state/FK triggers so these assertions exercise the
-- Phase A CHECK constraints themselves; the transaction always rolls back.
set local session_replication_role=replica;
select throws_ok($$insert into public.conversation_ai_settings(conversation_id,mode)
  values(gen_random_uuid(),'coach_draft')$$,
  '23514',null,'privileged writes cannot enable Phase A AI mode');
select throws_ok($$insert into public.messages(
  conversation_id,origin,body) values(gen_random_uuid(),'system','x')$$,
  '23514',null,'privileged writes cannot create Phase A system messages');

-- Assert physical index semantics (method, key order, uniqueness, validity,
-- predicates, and expressions), not just names.
with expected(schema_name,table_name,index_name,columns,is_unique,is_primary) as (values
  ('private','ai_generation_audits','ai_generation_audits_generated_message_id_key',
    array['generated_message_id'],true,false),
  ('private','ai_generation_inputs','ai_generation_inputs_pkey',
    array['generation_id','message_id'],true,true),
  ('private','ai_generation_inputs','ai_generation_inputs_generation_id_input_order_key',
    array['generation_id','input_order'],true,false),
  ('private','ai_generation_inputs','ai_generation_inputs_conversation_idx',
    array['conversation_id','generation_id'],false,false),
  ('private','ai_generation_inputs','ai_generation_inputs_message_idx',
    array['message_id'],false,false),
  ('public','message_receipts','message_receipts_pkey',
    array['message_id','user_id'],true,true),
  ('public','message_receipts','message_receipts_participant_idx',
    array['conversation_id','user_id'],false,false)
), actual as (
  select n.nspname::text schema_name,t.relname::text table_name,
    x.relname::text index_name,
    array_agg(a.attname::text order by k.ordinality) filter (where k.attnum>0) columns,
    i.indisunique is_unique,i.indisprimary is_primary,am.amname::text method,
    i.indisvalid,i.indisready,i.indpred is null no_predicate,
    i.indexprs is null no_expressions
  from pg_index i join pg_class x on x.oid=i.indexrelid
  join pg_class t on t.oid=i.indrelid join pg_namespace n on n.oid=t.relnamespace
  join pg_am am on am.oid=x.relam
  cross join lateral unnest(i.indkey::smallint[]) with ordinality k(attnum,ordinality)
  left join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum
  group by n.nspname,t.relname,x.relname,i.indisunique,i.indisprimary,am.amname,
    i.indisvalid,i.indisready,i.indpred,i.indexprs
)
select is((select count(*)::int from expected e left join actual a using(schema_name,table_name,index_name)
  where a.index_name is null or a.columns<>e.columns or a.is_unique<>e.is_unique
    or a.is_primary<>e.is_primary or a.method<>'btree' or not a.indisvalid
    or not a.indisready or not a.no_predicate or not a.no_expressions),0,
  'required supporting indexes have exact physical definitions');

with indexed as (
  select n.nspname,t.relname,i.indisunique,i.indisprimary,
    i.indpred,pg_get_expr(i.indexprs,i.indrelid) expressions,
    array_agg(a.attname::text order by k.ordinality) filter (where k.attnum>0) columns,
    count(*) over(partition by i.indrelid,i.indisunique,i.indisprimary,i.indpred,
      pg_get_expr(i.indexprs,i.indrelid),i.indkey) duplicate_count
  from pg_index i join pg_class t on t.oid=i.indrelid
  join pg_namespace n on n.oid=t.relnamespace
  cross join lateral unnest(i.indkey::smallint[]) with ordinality k(attnum,ordinality)
  left join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum
  where (n.nspname,t.relname) in (('private','ai_generation_audits'),
    ('private','ai_generation_inputs'),('public','message_receipts'))
  group by n.nspname,t.relname,i.indexrelid,i.indrelid,i.indisunique,i.indisprimary,
    i.indpred,i.indexprs,i.indkey
)
select is((select count(*)::int from indexed where duplicate_count>1),0,
  'messaging tables contain no structurally duplicate indexes');

with unwanted(schema_name,table_name,columns) as (values
  ('private','ai_generation_audits',array['generated_message_id','conversation_id']),
  ('private','ai_generation_inputs',array['generation_id','conversation_id']),
  ('private','ai_generation_inputs',array['message_id','conversation_id']),
  ('public','message_receipts',array['message_id','conversation_id'])
), actual as (
  select n.nspname schema_name,t.relname table_name,
    array_agg(a.attname::text order by k.ordinality) filter (where k.attnum>0) columns
  from pg_index i join pg_class t on t.oid=i.indrelid
  join pg_namespace n on n.oid=t.relnamespace
  cross join lateral unnest(i.indkey::smallint[]) with ordinality k(attnum,ordinality)
  left join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum
  where i.indpred is null and i.indexprs is null
  group by n.nspname,t.relname,i.indexrelid
)
select is((select count(*)::int from unwanted join actual using(schema_name,table_name,columns)),0,
  'no redundant advisor-shaped composite indexes exist under any name');

select is((select pg_get_constraintdef(oid,true) from pg_constraint
  where conname='conversation_ai_phase_a_off'),
  'CHECK (mode = ''off''::conversation_ai_mode)',
  'AI mode constraint remains exact');
select is((select pg_get_constraintdef(oid,true) from pg_constraint
  where conname='messages_phase_a_human_only'),
  'CHECK (origin = ANY (ARRAY[''client''::message_origin, ''coach''::message_origin]))',
  'message-origin constraint remains exact');

select * from finish();
rollback;
