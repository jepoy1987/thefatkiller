begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,private,extensions,auth;
select no_plan();

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id::uuid,'authenticated','authenticated',name||'@messaging-delete.example.test','',now(),'{}','{}',now(),now()
from (values
  ('e1111111-1111-4111-8111-111111111111','delete-client'),
  ('e2222222-2222-4222-8222-222222222222','client-coach'),
  ('e3333333-3333-4333-8333-333333333333','unrelated-client'),
  ('e4444444-4444-4444-8444-444444444444','delete-coach'),
  ('e5555555-5555-4555-8555-555555555555','coach-client'),
  ('e6666666-6666-4666-8666-666666666666','rollback-client'),
  ('e7777777-7777-4777-8777-777777777777','rollback-coach')) fixture(id,name);

insert into public.coach_client_relationships(id,coach_user_id,client_user_id,status,started_at) values
  ('ea111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222','e1111111-1111-4111-8111-111111111111','active',now()),
  ('ea222222-2222-4222-8222-222222222222','e2222222-2222-4222-8222-222222222222','e3333333-3333-4333-8333-333333333333','active',now()),
  ('ea333333-3333-4333-8333-333333333333','e4444444-4444-4444-8444-444444444444','e5555555-5555-4555-8555-555555555555','active',now()),
  ('ea444444-4444-4444-8444-444444444444','e7777777-7777-4777-8777-777777777777','e6666666-6666-4666-8666-666666666666','active',now());

insert into public.conversations(id,relationship_id) values
  ('eb111111-1111-4111-8111-111111111111','ea111111-1111-4111-8111-111111111111'),
  ('eb222222-2222-4222-8222-222222222222','ea222222-2222-4222-8222-222222222222'),
  ('eb333333-3333-4333-8333-333333333333','ea333333-3333-4333-8333-333333333333'),
  ('eb444444-4444-4444-8444-444444444444','ea444444-4444-4444-8444-444444444444');
insert into public.conversation_participants(conversation_id,user_id,participant_role) values
  ('eb111111-1111-4111-8111-111111111111','e1111111-1111-4111-8111-111111111111','client'),
  ('eb111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222','coach'),
  ('eb222222-2222-4222-8222-222222222222','e3333333-3333-4333-8333-333333333333','client'),
  ('eb222222-2222-4222-8222-222222222222','e2222222-2222-4222-8222-222222222222','coach'),
  ('eb333333-3333-4333-8333-333333333333','e5555555-5555-4555-8555-555555555555','client'),
  ('eb333333-3333-4333-8333-333333333333','e4444444-4444-4444-8444-444444444444','coach'),
  ('eb444444-4444-4444-8444-444444444444','e6666666-6666-4666-8666-666666666666','client'),
  ('eb444444-4444-4444-8444-444444444444','e7777777-7777-4777-8777-777777777777','coach');
insert into public.conversation_ai_settings(conversation_id)
values
  ('eb111111-1111-4111-8111-111111111111'),
  ('eb222222-2222-4222-8222-222222222222'),
  ('eb333333-3333-4333-8333-333333333333'),
  ('eb444444-4444-4444-8444-444444444444');

insert into private.ai_generation_audits(id,conversation_id,provider,model_identifier,prompt_version) values
  ('ec111111-1111-4111-8111-111111111111','eb111111-1111-4111-8111-111111111111','disabled','none','phase-a'),
  ('ec444444-4444-4444-8444-444444444444','eb444444-4444-4444-8444-444444444444','disabled','none','phase-a');
insert into public.messages(id,conversation_id,origin,author_user_id,body,ai_assistance_audit_id) values
  ('ed111111-1111-4111-8111-111111111111','eb111111-1111-4111-8111-111111111111','client','e1111111-1111-4111-8111-111111111111','Client cleanup message','ec111111-1111-4111-8111-111111111111'),
  ('ed222222-2222-4222-8222-222222222222','eb222222-2222-4222-8222-222222222222','client','e3333333-3333-4333-8333-333333333333','Unrelated message',null),
  ('ed333333-3333-4333-8333-333333333333','eb333333-3333-4333-8333-333333333333','coach','e4444444-4444-4444-8444-444444444444','Coach cleanup message',null),
  ('ed444444-4444-4444-8444-444444444444','eb444444-4444-4444-8444-444444444444','client','e6666666-6666-4666-8666-666666666666','Rollback message','ec444444-4444-4444-8444-444444444444');
insert into public.messages(id,conversation_id,origin,author_user_id,body,reply_to_message_id)
values('ed111112-1111-4111-8111-111111111111','eb111111-1111-4111-8111-111111111111','coach','e2222222-2222-4222-8222-222222222222','Cleanup reply','ed111111-1111-4111-8111-111111111111');
insert into private.ai_generation_inputs(generation_id,message_id,conversation_id,input_order) values
  ('ec111111-1111-4111-8111-111111111111','ed111111-1111-4111-8111-111111111111','eb111111-1111-4111-8111-111111111111',0),
  ('ec444444-4444-4444-8444-444444444444','ed444444-4444-4444-8444-444444444444','eb444444-4444-4444-8444-444444444444',0);
insert into public.message_receipts(message_id,conversation_id,user_id) values
  ('ed111111-1111-4111-8111-111111111111','eb111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222'),
  ('ed444444-4444-4444-8444-444444444444','eb444444-4444-4444-8444-444444444444','e7777777-7777-4777-8777-777777777777');

select throws_ok(
  $$delete from public.messages where id='ed111111-1111-4111-8111-111111111111'$$,
  '55000',null,'messages remain immutable outside leased cleanup');
select throws_ok(
  $$delete from private.conversation_ai_setting_events where conversation_id='eb111111-1111-4111-8111-111111111111'$$,
  '55000',null,'AI setting events remain append-only outside leased cleanup');

insert into private.account_deletions(user_id,ready_at,lease,lease_until) values
  ('e1111111-1111-4111-8111-111111111111',clock_timestamp()-interval '1 second','ee111111-1111-4111-8111-111111111111',clock_timestamp()+interval '5 minutes');
set local role service_role;
select ok(public.prepare_account_deletion('e1111111-1111-4111-8111-111111111111','ee111111-1111-4111-8111-111111111111'),'leased client cleanup completes');
reset role;
select is((select count(*)::int from private.ai_generation_inputs where conversation_id='eb111111-1111-4111-8111-111111111111'),0,'client AI inputs removed');
select is((select count(*)::int from private.ai_generation_audits where conversation_id='eb111111-1111-4111-8111-111111111111'),0,'client AI audits removed');
select is((select count(*)::int from private.conversation_ai_setting_events where conversation_id='eb111111-1111-4111-8111-111111111111'),0,'client AI events removed');
select is((select count(*)::int from public.message_receipts where conversation_id='eb111111-1111-4111-8111-111111111111'),0,'client receipts removed');
select is((select count(*)::int from public.messages where conversation_id='eb111111-1111-4111-8111-111111111111'),0,'client messages removed');
select is((select count(*)::int from public.conversation_ai_settings where conversation_id='eb111111-1111-4111-8111-111111111111'),0,'client AI settings removed');
select is((select count(*)::int from public.conversation_participants where conversation_id='eb111111-1111-4111-8111-111111111111'),0,'client participants removed');
select is((select count(*)::int from public.conversations where id='eb111111-1111-4111-8111-111111111111'),0,'client conversation removed');
select is((select count(*)::int from public.conversations where id='eb222222-2222-4222-8222-222222222222'),1,'unrelated conversation preserved');
select is((select count(*)::int from public.messages where conversation_id='eb222222-2222-4222-8222-222222222222'),1,'unrelated messages preserved');
select is((select count(*)::int from private.messaging_account_deletion_context),0,'trusted cleanup context is removed');
select lives_ok($$delete from auth.users where id='e1111111-1111-4111-8111-111111111111'$$,'client Auth deletion can cascade after preparation');

insert into private.account_deletions(user_id,ready_at,lease,lease_until) values
  ('e4444444-4444-4444-8444-444444444444',clock_timestamp()-interval '1 second','ee444444-4444-4444-8444-444444444444',clock_timestamp()+interval '5 minutes');
set local role service_role;
select ok(public.prepare_account_deletion('e4444444-4444-4444-8444-444444444444','ee444444-4444-4444-8444-444444444444'),'leased coach cleanup completes');
reset role;
select is((select count(*)::int from public.conversations where id='eb333333-3333-4333-8333-333333333333'),0,'coach conversation removed');
select lives_ok($$delete from auth.users where id='e4444444-4444-4444-8444-444444444444'$$,'coach Auth deletion can cascade after preparation');
select is((select count(*)::int from auth.users where id='e5555555-5555-4555-8555-555555555555'),1,'coach deletion preserves the client account');

create function pg_temp.fail_messaging_cleanup()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.id='eb444444-4444-4444-8444-444444444444' then
    raise exception 'forced cleanup failure' using errcode='P0001';
  end if;
  return old;
end;
$$;
create trigger test_force_cleanup_failure before delete on public.conversations
for each row execute function pg_temp.fail_messaging_cleanup();
insert into private.account_deletions(user_id,ready_at,lease,lease_until) values
  ('e6666666-6666-4666-8666-666666666666',clock_timestamp()-interval '1 second','ee666666-6666-4666-8666-666666666666',clock_timestamp()+interval '5 minutes');
set local role service_role;
select throws_ok(
  $$select public.prepare_account_deletion('e6666666-6666-4666-8666-666666666666','ee666666-6666-4666-8666-666666666666')$$,
  'P0001','forced cleanup failure','failed cleanup surfaces the underlying failure');
reset role;
select is((select count(*)::int from private.ai_generation_inputs where conversation_id='eb444444-4444-4444-8444-444444444444'),1,'failed cleanup restores AI inputs');
select is((select count(*)::int from private.ai_generation_audits where conversation_id='eb444444-4444-4444-8444-444444444444'),1,'failed cleanup restores AI audits');
select is((select count(*)::int from private.conversation_ai_setting_events where conversation_id='eb444444-4444-4444-8444-444444444444'),1,'failed cleanup restores AI events');
select is((select count(*)::int from public.message_receipts where conversation_id='eb444444-4444-4444-8444-444444444444'),1,'failed cleanup restores receipts');
select is((select count(*)::int from public.messages where conversation_id='eb444444-4444-4444-8444-444444444444'),1,'failed cleanup restores messages');
select is((select count(*)::int from public.conversation_ai_settings where conversation_id='eb444444-4444-4444-8444-444444444444'),1,'failed cleanup restores AI settings');
select is((select count(*)::int from public.conversation_participants where conversation_id='eb444444-4444-4444-8444-444444444444'),2,'failed cleanup restores participants');
select is((select count(*)::int from public.conversations where id='eb444444-4444-4444-8444-444444444444'),1,'failed cleanup restores conversation');
select is((select count(*)::int from private.messaging_account_deletion_context),0,'failed cleanup rolls back its trusted context');

select * from finish();
rollback;
