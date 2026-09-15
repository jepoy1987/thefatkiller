begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,auth;
select no_plan();
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id::uuid,'authenticated','authenticated',name||'@training.example.test','',now(),'{}','{}',now(),now()
from (values
('91111111-1111-4111-8111-111111111111','client-a'),('92222222-2222-4222-8222-222222222222','client-b'),
('93333333-3333-4333-8333-333333333333','coach-a'),('94444444-4444-4444-8444-444444444444','coach-b'),
('95555555-5555-4555-8555-555555555555','free'),('96666666-6666-4666-8666-666666666666','admin'))u(id,name);
update public.user_roles set role='coach' where user_id in ('93333333-3333-4333-8333-333333333333','94444444-4444-4444-8444-444444444444');
update public.user_roles set role='admin' where user_id='96666666-6666-4666-8666-666666666666';
insert into public.user_subscriptions(user_id,plan_id,status,provider)
select u.id::uuid,p.id,'active','internal' from (values('91111111-1111-4111-8111-111111111111','premium'),('92222222-2222-4222-8222-222222222222','premium'),('93333333-3333-4333-8333-333333333333','coach'),('94444444-4444-4444-8444-444444444444','coach'))u(id,code) join public.plans p on p.code=u.code;
insert into public.coach_client_relationships(coach_user_id,client_user_id,status) values('93333333-3333-4333-8333-333333333333','91111111-1111-4111-8111-111111111111','active');

-- This file is safe to run on staging: all fixtures and worker mutations roll back.
select ok((select rowsecurity from pg_tables where schemaname='public' and tablename='weekly_insights'),'Insight RLS enabled');
set local role anon;
select throws_ok($$select * from public.weekly_insights$$,'42501',null,'Anonymous cannot read insights');
select throws_ok($$select public.get_weekly_insight_source()$$,'42501',null,'Anonymous cannot aggregate');
set local role authenticated;
select set_config('request.jwt.claim.sub','95555555-5555-4555-8555-555555555555',true);
select throws_ok($$select public.get_weekly_insight_source()$$,'42501',null,'Free user cannot generate input');
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
select lives_ok($$select public.get_weekly_insight_source()$$,'Premium can aggregate own input');
select is(jsonb_array_length(public.get_weekly_insight_source()->'score_input'->'days'),7,'Exactly seven daily score signals');
select is(public.get_weekly_insight_source()->'score_input',public.get_accountability_score_input(),'Same canonical scoring input');
select throws_ok($$select private.weekly_insight_source('92222222-2222-4222-8222-222222222222')$$,'42501',null,'Cannot aggregate arbitrary user');
select throws_ok($$select public.claim_weekly_insight('92222222-2222-4222-8222-222222222222','{}')$$,'42501',null,'Client cannot generate for another user');
select throws_ok($$select public.claim_weekly_insight(auth.uid(),'{}')$$,'42501',null,'Client cannot forge a source snapshot');
select throws_ok($$select public.finish_weekly_insight(gen_random_uuid(),auth.uid(),1,'{}','forged',null)$$,'42501',null,'Client cannot forge provider results');
select throws_ok($$insert into public.weekly_insights(user_id,period_start,period_end,timezone,prompt_version,input_snapshot) values(auth.uid(),current_date-6,current_date,'UTC','tfk-weekly-v1','{}')$$,'42501',null,'Direct client writes blocked');
select set_config('qa.input',jsonb_build_object('period',public.get_weekly_insight_source()->'period')::text,true);
set local role service_role;
select set_config('qa.claim',public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)::text,true);
select ok((current_setting('qa.claim')::jsonb->>'claimed')::boolean,'Worker can claim entitled client generation');
select is((public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)->>'claimed')::boolean,false,'Concurrent duplicate claim blocked');
-- Inspect through the owner policy; workers need RPC execution only, not table grants.
set local role authenticated;
select is((select count(*)::int from public.weekly_insights where user_id='91111111-1111-4111-8111-111111111111'),1,'One row per user period version');
set local role service_role;
select throws_ok($$select public.claim_weekly_insight('95555555-5555-4555-8555-555555555555',current_setting('qa.input')::jsonb)$$,'42501',null,'Worker cannot bypass free entitlement');
select throws_ok($$select public.claim_weekly_insight('91111111-1111-4111-8111-111111111111','{"period":{"start":"2000-01-01"}}')$$,'22023',null,'Worker rejects invalid period');
set local role authenticated;
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
select is((select count(*)::int from public.weekly_insights),1,'Owner reads own insight');
select is((select input_snapshot from public.weekly_insights),current_setting('qa.input')::jsonb,'Owner reads stored input snapshot');
select throws_ok($$update public.weekly_insights set user_id='92222222-2222-4222-8222-222222222222'$$,'42501',null,'Owner cannot transfer insight');
select throws_ok($$delete from public.weekly_insights$$,'42501',null,'Owner cannot bypass generation quota by deleting history');
select set_config('request.jwt.claim.sub','92222222-2222-4222-8222-222222222222',true);
select is((select count(*)::int from public.weekly_insights),0,'User B cannot read User A insight');
select is((select count(*)::int from public.weekly_insights where id=(current_setting('qa.claim')::jsonb->>'id')::uuid),0,'Known arbitrary insight ID blocked');
select is((select count(input_snapshot)::int from public.weekly_insights),0,'Cross-user snapshot blocked');
select set_config('request.jwt.claim.sub','93333333-3333-4333-8333-333333333333',true);
select lives_ok($$select public.get_weekly_insight_source()$$,'Coach plan can generate own input');
select is((select count(*)::int from public.weekly_insights),0,'Active coach cannot read client insight');
select set_config('request.jwt.claim.sub','96666666-6666-4666-8666-666666666666',true);
select is((select count(*)::int from public.weekly_insights),0,'Admin has no private insight override');
set local role service_role;
select is(public.finish_weekly_insight((current_setting('qa.claim')::jsonb->>'id')::uuid,'92222222-2222-4222-8222-222222222222',1,'{}','mock',null),false,'Worker finalization requires matching owner');
select is(public.finish_weekly_insight((current_setting('qa.claim')::jsonb->>'id')::uuid,'91111111-1111-4111-8111-111111111111',1,null,'mock','provider_failed'),true,'Provider failure persisted');
set local role authenticated;
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
select is((select status from public.weekly_insights where id=(current_setting('qa.claim')::jsonb->>'id')::uuid),'failed','Failure status safe');
select is((select insight_json from public.weekly_insights where id=(current_setting('qa.claim')::jsonb->>'id')::uuid),null::jsonb,'No failed provider payload stored');
set local role service_role;
select is((public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)->>'claimed')::boolean,false,'Immediate failed retry blocked');
reset role;
update public.weekly_insights set retry_after=now()-interval '1 second' where id=(current_setting('qa.claim')::jsonb->>'id')::uuid;
set local role service_role;
select is((public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)->>'attempt')::int,2,'Retry after cooldown increments fenced attempt');
select is(public.finish_weekly_insight((current_setting('qa.claim')::jsonb->>'id')::uuid,'91111111-1111-4111-8111-111111111111',1,'{"summary":"late"}','mock',null),false,'Late first attempt cannot overwrite retry');
select is(public.finish_weekly_insight((current_setting('qa.claim')::jsonb->>'id')::uuid,'91111111-1111-4111-8111-111111111111',2,'{"headline":"Mock","summary":"Mock verified report"}','mock',null),true,'Current attempt can finalize');
select is((public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)->>'status'),'completed','Completed insight reused');
select is(public.finish_weekly_insight((current_setting('qa.claim')::jsonb->>'id')::uuid,'91111111-1111-4111-8111-111111111111',2,'{"summary":"overwrite"}','mock',null),false,'Completed insight immutable');
reset role;
-- Retry budget and abandoned pending-lease recovery are database enforced.
update public.weekly_insights set status='failed',insight_json=null,generated_at=null,attempts=3,retry_after=now()-interval '1 minute' where id=(current_setting('qa.claim')::jsonb->>'id')::uuid;
set local role service_role;
select is((public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)->>'claimed')::boolean,false,'Three-attempt budget enforced');
reset role;
update public.weekly_insights set status='pending',attempts=1 where id=(current_setting('qa.claim')::jsonb->>'id')::uuid;
set local role service_role;
select is((public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)->>'attempt')::int,2,'Expired pending lease can recover');
reset role;
-- A different valid local period is still subject to the rolling cost limit.
update public.weekly_insights set period_start=period_start-1,period_end=period_end-1 where id=(current_setting('qa.claim')::jsonb->>'id')::uuid;
set local role service_role;
select throws_ok($$select public.claim_weekly_insight('91111111-1111-4111-8111-111111111111',current_setting('qa.input')::jsonb)$$,'54000',null,'Cross-period generation rate limit enforced');
reset role;
-- Actual SQL calendar boundaries and excluded sensitive columns.
update public.profiles set timezone='Asia/Manila' where id='91111111-1111-4111-8111-111111111111';
select is(private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-03-09 23:30Z')->'period'->>'end','2026-03-10','Manila uses next local date');
update public.profiles set timezone='America/Chicago' where id='91111111-1111-4111-8111-111111111111';
select is(private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-03-09 04:30Z')->'period'->>'end','2026-03-08','Chicago spring DST local end');
select is(jsonb_array_length(private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-03-09 04:30Z')->'score_input'->'days'),7,'Chicago spring DST seven dates');
select is(private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-11-02 05:30Z')->'period'->>'end','2026-11-01','Chicago fall DST local end');
insert into public.weight_entries(user_id,weight_kg,recorded_at,notes) values
('91111111-1111-4111-8111-111111111111',90,'2026-03-01 23:00-06','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111',89,'2026-03-02 00:00-06','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111',88,'2026-03-08 23:00-05','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111',87,'2026-03-09 00:00-05','PRIVATE_SENTINEL');
select is((private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-03-09 04:30Z')->>'weigh_ins')::int,2,'UTC boundaries exclude prior and future local date across DST');
select ok(private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-03-09 04:30Z')::text not like '%PRIVATE_SENTINEL%','Raw progress notes excluded');
select ok(not (private.weekly_insight_source('91111111-1111-4111-8111-111111111111') ?| array['glp1','glp1_summary','notes','photo_urls','auth_metadata','billing_id','coach_notes']),'No sensitive source categories');

-- Verify aggregation of actual records, not just TypeScript fixture mapping.
insert into public.food_logs(user_id,meal_type,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,logged_at,notes)
values('91111111-1111-4111-8111-111111111111','lunch','PRIVATE_FOOD',1,1,'serving',500,40,50,10,'2026-03-08 12:00-05','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111','dinner','PRIVATE_FOOD',1,1,'serving',600,50,50,10,'2026-03-08 18:00-05','PRIVATE_SENTINEL');
insert into public.water_logs(user_id,amount_ml,logged_at) values
('91111111-1111-4111-8111-111111111111',500,'2026-03-08 12:00-05'),
('91111111-1111-4111-8111-111111111111',750,'2026-03-08 18:00-05');
insert into public.habits(id,user_id,name,created_at) values('97777777-7777-4777-8777-777777777777','91111111-1111-4111-8111-111111111111','PRIVATE_HABIT','2026-03-01');
insert into public.habit_completions(habit_id,user_id,completed_on,notes) values('97777777-7777-4777-8777-777777777777','91111111-1111-4111-8111-111111111111','2026-03-08','PRIVATE_SENTINEL');
insert into public.daily_check_ins(user_id,check_in_date,notes) values('91111111-1111-4111-8111-111111111111','2026-03-08','PRIVATE_SENTINEL');
insert into public.weekly_check_ins(user_id,week_start,notes,created_at) values('91111111-1111-4111-8111-111111111111','2026-03-02','PRIVATE_SENTINEL','2026-03-08');
select set_config('qa.aggregate',private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-03-09 04:30Z')::text,true);
select is((current_setting('qa.aggregate')::jsonb->'score_input'->'days'->6->>'calories')::numeric,1100::numeric,'Nutrition sums bounded daily entries');
select is((current_setting('qa.aggregate')::jsonb->'score_input'->'days'->6->>'protein')::numeric,90::numeric,'Protein sums bounded daily entries');
select is((current_setting('qa.aggregate')::jsonb->'score_input'->'days'->6->>'water')::numeric,1250::numeric,'Water sums bounded daily entries');
select is((current_setting('qa.aggregate')::jsonb->>'water_logged_days')::int,1,'Multiple water entries count as one local day');
select is((current_setting('qa.aggregate')::jsonb->'score_input'->'days'->6->>'habitCompleted')::int,1,'Daily habit completion included');
select is((current_setting('qa.aggregate')::jsonb->'score_input'->'days'->6->>'checkedIn')::boolean,true,'Daily check-in completion included');
select is((current_setting('qa.aggregate')::jsonb->>'weekly_check_ins')::int,1,'Overlapping weekly check-in included');
select ok(current_setting('qa.aggregate') not like '%PRIVATE_%','Food names, habit names and check-in notes excluded');
insert into public.workout_templates(id,owner_user_id,name) values('98888888-8888-4888-8888-888888888888','93333333-3333-4333-8333-333333333333','PRIVATE_WORKOUT');
insert into public.workout_assignments(id,coach_user_id,client_user_id,relationship_id,workout_template_id,assigned_for,status,completed_at)
select '99999999-9999-4999-8999-999999999999',coach_user_id,client_user_id,id,'98888888-8888-4888-8888-888888888888','2026-03-08','completed','2026-03-08 12:00-05' from public.coach_client_relationships where coach_user_id='93333333-3333-4333-8333-333333333333';
insert into public.workout_sessions(user_id,assignment_id,workout_template_id,name_snapshot,status,started_at,completed_at)
values('91111111-1111-4111-8111-111111111111','99999999-9999-4999-8999-999999999999','98888888-8888-4888-8888-888888888888','PRIVATE_WORKOUT','completed','2026-03-08 11:00-05','2026-03-08 12:00-05');
select is(private.weekly_insight_source('91111111-1111-4111-8111-111111111111','2026-03-09 04:30Z')->'training','{"assigned":1,"assigned_completed":1,"completed":1,"completed_days":1}'::jsonb,'Training assignment/session metrics match actual rows');
select * from finish();

rollback;
