begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,auth;
select plan(12);
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values('81111111-1111-4111-8111-111111111111','authenticated','authenticated','retention@local.test','{}','{}');
insert into public.food_photo_analyses(id,user_id,status,expires_at,storage_path) values
('82222222-2222-4222-8222-222222222222','81111111-1111-4111-8111-111111111111','pending',now()-interval '1 day','81111111-1111-4111-8111-111111111111/82222222-2222-4222-8222-222222222222-1.jpg'),
('83333333-3333-4333-8333-333333333333','81111111-1111-4111-8111-111111111111','failed',now()-interval '1 day',null),
('84444444-4444-4444-8444-444444444444','81111111-1111-4111-8111-111111111111','confirmed',now()+interval '1 day',null);
select throws_ok($$select * from public.claim_food_photo_cleanup(101)$$,'22023',null,'Batch max enforced');
select is((select count(*)::int from public.claim_food_photo_cleanup(1)),1,'Batch limit respected');
select is((select count(*)::int from public.claim_food_photo_cleanup(100)),1,'Leased row excluded; failed row included');
select is((select count(*)::int from public.claim_food_photo_cleanup()),0,'Overlapping run cannot reclaim live leases');
select is((select cleanup_claim from public.food_photo_analyses where id='84444444-4444-4444-8444-444444444444'),null::uuid,'Current confirmed analysis not claimed');
select is(public.complete_food_photo_cleanup('82222222-2222-4222-8222-222222222222','81111111-1111-4111-8111-111111111111',gen_random_uuid(),'81111111-1111-4111-8111-111111111111/82222222-2222-4222-8222-222222222222-1.jpg'),false,'Stale claim cannot acknowledge');
select is(public.complete_food_photo_cleanup('82222222-2222-4222-8222-222222222222','81111111-1111-4111-8111-111111111111',(select cleanup_claim from public.food_photo_analyses where id='82222222-2222-4222-8222-222222222222'),'other/path'),false,'Cross-path acknowledgement rejected');
select ok(public.complete_food_photo_cleanup('82222222-2222-4222-8222-222222222222','81111111-1111-4111-8111-111111111111',(select cleanup_claim from public.food_photo_analyses where id='82222222-2222-4222-8222-222222222222'),'81111111-1111-4111-8111-111111111111/82222222-2222-4222-8222-222222222222-1.jpg'),'Exact fenced acknowledgement succeeds');
select is((select status from public.food_photo_analyses where id='82222222-2222-4222-8222-222222222222'),'expired','Acknowledged analysis expired');
update public.food_photo_analyses set cleanup_lease_until=now()-interval '1 minute' where status='failed' and user_id='81111111-1111-4111-8111-111111111111';
select is((select count(*)::int from public.claim_food_photo_cleanup()),1,'Failed worker lease reclaimed');
set local role authenticated;
select throws_ok($$select * from public.claim_food_photo_cleanup()$$,'42501',null,'Ordinary users cannot claim cleanup');
select throws_ok($$select public.complete_food_photo_cleanup(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null)$$,'42501',null,'Ordinary users cannot acknowledge cleanup');
reset role;
select * from finish();rollback;
