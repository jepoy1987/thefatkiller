begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,auth;
select no_plan();
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('91111111-1111-4111-8111-111111111119','authenticated','authenticated','photo-safety@local.test','{}','{}');
insert into public.user_subscriptions(user_id,plan_id,status,provider)
select '91111111-1111-4111-8111-111111111119',id,'active','internal' from public.plans where code='premium';
select public.claim_food_photo('94444444-4444-4444-8444-444444444449','91111111-1111-4111-8111-111111111119');
-- Match the generation safety boundary: only null plus a fixed code is sent.
select ok(public.finish_food_photo('94444444-4444-4444-8444-444444444449','91111111-1111-4111-8111-111111111119',1,null,'mock','fixture','invalid_output',true),'Rejected output records safe failure');
select is((select status from public.food_photo_analyses where id='94444444-4444-4444-8444-444444444449'),'failed','Unsafe analysis never completes');
select is((select result_json from public.food_photo_analyses where id='94444444-4444-4444-8444-444444444449'),null::jsonb,'Unsafe output is not persisted');
select is((select error_code from public.food_photo_analyses where id='94444444-4444-4444-8444-444444444449'),'invalid_output','Only safe error code is persisted');
select is((select storage_path from public.food_photo_analyses where id='94444444-4444-4444-8444-444444444449'),null::text,'Deleted image path cleared');
set local role authenticated;
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111119',true);
select throws_ok($$select public.confirm_food_photo('94444444-4444-4444-8444-444444444449','[]','lunch',now())$$,'22023',null,'Failed analysis cannot be confirmed');
select is((select count(*)::int from public.food_logs where user_id=auth.uid()),0,'Unsafe analysis creates no food logs');
reset role;
select is((public.claim_food_photo('94444444-4444-4444-8444-444444444449','91111111-1111-4111-8111-111111111119')->>'claimed')::boolean,false,'Reload cannot retry automatically');
select is((public.claim_food_photo('94444444-4444-4444-8444-444444444449','91111111-1111-4111-8111-111111111119',true)->>'claimed')::boolean,true,'Explicit retry remains available');
select * from finish();
rollback;
