begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,private,extensions,auth;
select no_plan();

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id::uuid,'authenticated','authenticated',name||'@messaging.example.test','',now(),'{}','{}',now(),now()
from (values
  ('b1111111-1111-4111-8111-111111111111','client-a'),
  ('b2222222-2222-4222-8222-222222222222','client-b'),
  ('b3333333-3333-4333-8333-333333333333','client-c'),
  ('b4444444-4444-4444-8444-444444444444','coach-a'),
  ('b5555555-5555-4555-8555-555555555555','coach-b'),
  ('b6666666-6666-4666-8666-666666666666','outsider'),
  ('b7777777-7777-4777-8777-777777777777','admin')) u(id,name);

update public.user_roles set role='coach'
where user_id in ('b4444444-4444-4444-8444-444444444444','b5555555-5555-4555-8555-555555555555');
update public.user_roles set role='admin'
where user_id='b7777777-7777-4777-8777-777777777777';
insert into public.user_subscriptions(user_id,plan_id,status,provider)
select u.id::uuid,p.id,'active','internal'
from (values
  ('b4444444-4444-4444-8444-444444444444'),
  ('b5555555-5555-4555-8555-555555555555')
) u(id) cross join public.plans p where p.code='coach';

insert into public.coach_client_relationships(id,coach_user_id,client_user_id,status,started_at) values
  ('ba111111-1111-4111-8111-111111111111','b4444444-4444-4444-8444-444444444444','b1111111-1111-4111-8111-111111111111','active',now()),
  ('ba222222-2222-4222-8222-222222222222','b4444444-4444-4444-8444-444444444444','b2222222-2222-4222-8222-222222222222','active',now()),
  ('ba333333-3333-4333-8333-333333333333','b4444444-4444-4444-8444-444444444444','b3333333-3333-4333-8333-333333333333','active',now());

-- Repeated calls exercise the same unique-index conflict path that serializes
-- concurrent creation: one active relationship can produce only one row.
set local role authenticated;
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
select set_config('qa.conversation_a',(public.get_or_create_conversation('ba111111-1111-4111-8111-111111111111')).id::text,true);
select is((public.get_or_create_conversation('ba111111-1111-4111-8111-111111111111')).id::text,current_setting('qa.conversation_a'),'conversation creation is idempotent');
reset role;
select is((select count(*)::int from public.conversations where relationship_id='ba111111-1111-4111-8111-111111111111' and status='active'),1,'one active conversation per relationship');
select throws_ok(
  $$insert into public.conversations(relationship_id) values('ba111111-1111-4111-8111-111111111111')$$,
  '23505',null,'partial unique index rejects duplicate active conversation creation');

set local role authenticated;
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
select set_config('qa.conversation_b',(public.get_or_create_conversation('ba222222-2222-4222-8222-222222222222')).id::text,true);
select set_config('request.jwt.claim.sub','b3333333-3333-4333-8333-333333333333',true);
select set_config('qa.old_conversation',(public.get_or_create_conversation('ba333333-3333-4333-8333-333333333333')).id::text,true);

-- Client and assigned coach can send; origin and author are database-derived.
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
select set_config('qa.client_message',(public.send_message(current_setting('qa.conversation_a')::uuid,' Client hello ')).id::text,true);
select is((select origin::text from public.messages where id=current_setting('qa.client_message')::uuid),'client','client origin is derived');
select is((select author_user_id::text from public.messages where id=current_setting('qa.client_message')::uuid),'b1111111-1111-4111-8111-111111111111','client author is auth.uid');
select is((select body from public.messages where id=current_setting('qa.client_message')::uuid),'Client hello','message body is normalized');
select set_config('request.jwt.claim.sub','b4444444-4444-4444-8444-444444444444',true);
select set_config('qa.coach_message',(public.send_message(current_setting('qa.conversation_a')::uuid,'Coach hello')).id::text,true);
select is((select origin::text from public.messages where id=current_setting('qa.coach_message')::uuid),'coach','coach origin is derived');
select is((select author_user_id::text from public.messages where id=current_setting('qa.coach_message')::uuid),'b4444444-4444-4444-8444-444444444444','coach author is auth.uid');

-- The public API has no origin/author parameters and direct writes are denied.
select throws_ok(
  $$insert into public.messages(conversation_id,origin,author_user_id,body) values(current_setting('qa.conversation_a')::uuid,'coach','b1111111-1111-4111-8111-111111111111','spoof')$$,
  '42501',null,'client cannot directly spoof coach origin');
select throws_ok(
  $$insert into public.messages(conversation_id,origin,body) values(current_setting('qa.conversation_a')::uuid,'ai_assistant','spoof')$$,
  '42501',null,'client cannot directly spoof AI origin');
select throws_ok(
  $$insert into public.messages(conversation_id,origin,body) values(current_setting('qa.conversation_a')::uuid,'system','spoof')$$,
  '42501',null,'client cannot directly spoof system origin');
select throws_ok($$select public.send_message(current_setting('qa.conversation_a')::uuid,'   ')$$,'22023',null,'empty message rejected');
select throws_ok($$select public.send_message(current_setting('qa.conversation_a')::uuid,repeat('x',4001))$$,'22023',null,'oversized message rejected');

-- An assigned coach is still isolated from other coaches' conversations.
select set_config('request.jwt.claim.sub','b5555555-5555-4555-8555-555555555555',true);
select throws_ok($$select public.send_message(current_setting('qa.conversation_a')::uuid,'unrelated')$$,'42501',null,'unrelated coach cannot send');
select is((select count(*)::int from public.messages),0,'different coach cannot read messages');
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
select is((select count(*)::int from public.messages),0,'two clients under one coach remain isolated');
select set_config('request.jwt.claim.sub','b6666666-6666-4666-8666-666666666666',true);
select is((select count(*)::int from public.conversations),0,'nonparticipant cannot read conversations');
select is((select count(*)::int from public.messages),0,'nonparticipant cannot read messages');
select set_config('request.jwt.claim.sub','b7777777-7777-4777-8777-777777777777',true);
select is((select count(*)::int from public.conversations),0,'admin is not automatically a participant');
select throws_ok($$select public.get_or_create_conversation('ba111111-1111-4111-8111-111111111111')$$,'42501',null,'admin cannot create participant access');

set local role anon;
select throws_ok($$select * from public.conversations$$,'42501',null,'anonymous conversation access denied');
select throws_ok($$select * from public.messages$$,'42501',null,'anonymous message access denied');
select throws_ok($$select public.send_message(current_setting('qa.conversation_a')::uuid,'anonymous')$$,'42501',null,'anonymous RPC execution denied');

-- Receipts belong only to the receiving active participant.
set local role authenticated;
select set_config('request.jwt.claim.sub','b4444444-4444-4444-8444-444444444444',true);
select lives_ok(
  $$insert into public.message_receipts(message_id,user_id) values(current_setting('qa.client_message')::uuid,'b4444444-4444-4444-8444-444444444444')$$,
  'receiving coach can create receipt');
select lives_ok(
  $$update public.message_receipts set read_at=read_at+interval '1 second'
    where message_id=current_setting('qa.client_message')::uuid and user_id='b4444444-4444-4444-8444-444444444444'$$,
  'receiving coach can update own receipt');
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
select throws_ok(
  $$insert into public.message_receipts(message_id,user_id) values(current_setting('qa.client_message')::uuid,'b1111111-1111-4111-8111-111111111111')$$,
  '42501',null,'message author cannot create own receiving receipt');
select throws_ok(
  $$insert into public.message_receipts(message_id,user_id) values(current_setting('qa.coach_message')::uuid,'b2222222-2222-4222-8222-222222222222')$$,
  '42501',null,'receipt cannot be written for another user');
select set_config('qa.receipt_at',(select read_at::text from public.message_receipts
  where message_id=current_setting('qa.client_message')::uuid),true);
select lives_ok(
  $$update public.message_receipts set read_at=read_at+interval '1 second'
    where message_id=current_setting('qa.client_message')::uuid$$,
  'sender receipt update attempt is safely filtered');
select is((select read_at::text from public.message_receipts
  where message_id=current_setting('qa.client_message')::uuid),current_setting('qa.receipt_at'),'sender cannot update the receiver receipt');

-- Public roles cannot mutate messages; the table trigger also protects future grants.
select throws_ok($$update public.messages set body='changed' where id=current_setting('qa.client_message')::uuid$$,'42501',null,'authenticated message update denied');
select throws_ok($$delete from public.messages where id=current_setting('qa.client_message')::uuid$$,'42501',null,'authenticated message delete denied');
reset role;
select throws_ok($$update public.messages set origin='coach' where id=current_setting('qa.client_message')::uuid$$,'55000',null,'origin is immutable');
select throws_ok($$update public.messages set author_user_id='b4444444-4444-4444-8444-444444444444' where id=current_setting('qa.client_message')::uuid$$,'55000',null,'author is immutable');
select throws_ok($$update public.messages set conversation_id=current_setting('qa.conversation_b')::uuid where id=current_setting('qa.client_message')::uuid$$,'55000',null,'conversation is immutable');
select throws_ok($$update public.messages set created_at=now()-interval '1 day' where id=current_setting('qa.client_message')::uuid$$,'55000',null,'created_at is immutable');

-- Composite FK prevents a reply from crossing conversation boundaries.
select throws_ok(
  $$insert into public.messages(conversation_id,origin,author_user_id,body,reply_to_message_id)
    values(current_setting('qa.conversation_b')::uuid,'client','b2222222-2222-4222-8222-222222222222','cross reply',current_setting('qa.client_message')::uuid)$$,
  '23503',null,'reply target must belong to the same conversation');
select throws_ok(
  $$insert into public.messages(conversation_id,origin,body)
    values(current_setting('qa.conversation_a')::uuid,'ai_assistant','disabled')$$,
  '23514',null,'even a privileged insert cannot create an AI message in Phase A');

-- AI is fail-closed: off by default, consent cannot enable it, and audit tables
-- are neither exposed nor writable by authenticated users.
select is((select mode::text from public.conversation_ai_settings where conversation_id=current_setting('qa.conversation_a')::uuid),'off','AI mode defaults to off');
update public.conversation_ai_settings set consent_status='granted',consented_at=now(),consent_version='v1',consent_purpose='future coach drafts'
where conversation_id=current_setting('qa.conversation_a')::uuid;
select is((select mode::text from public.conversation_ai_settings where conversation_id=current_setting('qa.conversation_a')::uuid),'off','consent alone cannot activate AI');
select throws_ok(
  $$update private.conversation_ai_setting_events set consent_version='tampered'
    where conversation_id=current_setting('qa.conversation_a')::uuid$$,
  '55000',null,'AI setting event history cannot be updated');
select throws_ok(
  $$delete from private.conversation_ai_setting_events
    where conversation_id=current_setting('qa.conversation_a')::uuid$$,
  '55000',null,'AI setting event history cannot be deleted');
select throws_ok(
  $$update public.conversation_ai_settings set mode='client_facing' where conversation_id=current_setting('qa.conversation_a')::uuid$$,
  '23514',null,'Phase A constraint rejects client-facing AI');
set local role authenticated;
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
select throws_ok(
  $$insert into private.ai_generation_audits(conversation_id,provider,model_identifier,prompt_version)
    values(current_setting('qa.conversation_a')::uuid,'forged','forged','forged')$$,
  '42501',null,'authenticated user cannot insert AI audit records');
reset role;
select set_config('qa.audit',gen_random_uuid()::text,true);
insert into private.ai_generation_audits(id,conversation_id,provider,model_identifier,prompt_version)
values(current_setting('qa.audit')::uuid,current_setting('qa.conversation_a')::uuid,'disabled-scaffold','none','phase-a');
select throws_ok(
  $$insert into private.ai_generation_inputs(generation_id,message_id,conversation_id,input_order)
    values(current_setting('qa.audit')::uuid,current_setting('qa.client_message')::uuid,current_setting('qa.conversation_b')::uuid,0)$$,
  '23503',null,'AI input cannot cross conversation boundaries');
select lives_ok(
  $$insert into private.ai_generation_inputs(generation_id,message_id,conversation_id,input_order)
    values(current_setting('qa.audit')::uuid,current_setting('qa.client_message')::uuid,current_setting('qa.conversation_a')::uuid,0)$$,
  'same-conversation AI provenance is structurally valid while processing remains disabled');
select throws_ok(
  $$insert into private.ai_generation_audits(conversation_id,generated_message_id,provider,model_identifier,prompt_version)
    values(current_setting('qa.conversation_b')::uuid,current_setting('qa.client_message')::uuid,'disabled-scaffold','none','phase-a')$$,
  '23503',null,'generated message provenance cannot cross conversation boundaries');

-- Paused and ended relationships fail closed for both reads and sends.
update public.coach_client_relationships set status='paused' where id='ba111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
select is((select count(*)::int from public.messages),0,'paused relationship cannot read messages');
select throws_ok($$select public.send_message(current_setting('qa.conversation_a')::uuid,'paused')$$,'42501',null,'paused relationship blocks sending');
reset role;
update public.coach_client_relationships set status='ended',ended_at=now() where id='ba111111-1111-4111-8111-111111111111';
set local role authenticated;
select throws_ok($$select public.send_message(current_setting('qa.conversation_a')::uuid,'ended')$$,'42501',null,'ended relationship blocks sending');

-- Reassignment creates a new relationship; the previous coach cannot use the old conversation.
reset role;
update public.coach_client_relationships set status='ended',ended_at=now() where id='ba333333-3333-4333-8333-333333333333';
insert into public.coach_client_relationships(id,coach_user_id,client_user_id,status,started_at)
values('ba444444-4444-4444-8444-444444444444','b5555555-5555-4555-8555-555555555555','b3333333-3333-4333-8333-333333333333','active',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','b4444444-4444-4444-8444-444444444444',true);
select throws_ok($$select public.send_message(current_setting('qa.old_conversation')::uuid,'former coach')$$,'42501',null,'reassigned relationship blocks previous coach');
select set_config('request.jwt.claim.sub','b3333333-3333-4333-8333-333333333333',true);
select set_config('qa.new_conversation',(public.get_or_create_conversation('ba444444-4444-4444-8444-444444444444')).id::text,true);
select isnt(current_setting('qa.new_conversation'),current_setting('qa.old_conversation'),'reassignment uses a distinct conversation');

select * from finish();
rollback;
