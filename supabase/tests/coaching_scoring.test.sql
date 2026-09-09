begin;
create extension if not exists pgtap;
set local search_path=public,extensions,auth;
select no_plan();
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','91111111-1111-4111-8111-111111111111','authenticated','authenticated','score-coach@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','92222222-2222-4222-8222-222222222222','authenticated','authenticated','score-client@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','93333333-3333-4333-8333-333333333333','authenticated','authenticated','score-other@example.test','',now(),'{}','{}',now(),now());
update public.user_roles set role='coach' where user_id='91111111-1111-4111-8111-111111111111';
insert into public.user_subscriptions(user_id,plan_id,status,provider) select '91111111-1111-4111-8111-111111111111',id,'active','internal' from public.plans where code='coach';
insert into public.coach_client_relationships(coach_user_id,client_user_id,status,started_at) values('91111111-1111-4111-8111-111111111111','92222222-2222-4222-8222-222222222222','active',now());
insert into public.coaching_privacy_settings(user_id) values('92222222-2222-4222-8222-222222222222');
update public.profiles set timezone='UTC' where id='92222222-2222-4222-8222-222222222222';
insert into public.habits(id,user_id,name,created_at) values('94444444-4444-4444-8444-444444444444','92222222-2222-4222-8222-222222222222','Daily fixture',now()-interval '30 days');
insert into public.habit_completions(habit_id,user_id,completed_on) values('94444444-4444-4444-8444-444444444444','92222222-2222-4222-8222-222222222222',current_date);
select is((private.accountability_score_input('92222222-2222-4222-8222-222222222222')->'days'->0->>'date'),(current_date-6)::text,'Window starts today minus six');
select is(jsonb_array_length(private.accountability_score_input('92222222-2222-4222-8222-222222222222')->'days'),7,'Zero dates retained: exactly seven daily inputs');
set local role authenticated;
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
select is((public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'accountability'->>'habit_completion_pct')::numeric,14.29,'One daily completion is 14.29 percent');
select throws_ok($$select public.get_coach_client_summary('93333333-3333-4333-8333-333333333333')$$,'42501',null,'Unassigned summary remains denied');
select throws_ok($$select private.accountability_score_input('92222222-2222-4222-8222-222222222222')$$,'42501',null,'Raw private scoring helper cannot be called by authenticated users');
select set_config('qa.coach_input',(public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'score_input')::text,true);
select set_config('request.jwt.claim.sub','92222222-2222-4222-8222-222222222222',true);
select is(public.get_accountability_score_input(),current_setting('qa.coach_input')::jsonb,'Owner and assigned coach receive identical canonical scoring inputs');
select throws_ok($$select public.get_coach_dashboard()$$,'42501',null,'Client cannot access coach dashboard');
update public.coaching_privacy_settings set share_nutrition=false where user_id=auth.uid();
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
select is((public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'score_input')::text,'null','Withheld nutrition removes all full-score inputs');
select is((public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'availability'->>'nutrition')::boolean,false,'Withheld category explicitly unavailable');
select is((public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'nutrition')::text,'null','No nutrition payload when withheld');
select is((public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'glp1_summary')::text,'null','GLP1 remains off');
reset role;
insert into public.habit_completions(habit_id,user_id,completed_on) select '94444444-4444-4444-8444-444444444444','92222222-2222-4222-8222-222222222222',current_date-i from generate_series(1,6) i;
select is((select sum((d->>'habitCompleted')::int) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222')->'days') d),7::bigint,'Seven of seven completions');
select is((public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'accountability'->>'habit_completion_pct')::numeric,100::numeric,'Seven of seven is 100 percent');
delete from public.habit_completions where habit_id='94444444-4444-4444-8444-444444444444';
select is((select sum((d->>'habitCompleted')::int) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222')->'days') d),0::bigint,'Zero of seven completions');
select is((public.get_coach_client_summary('92222222-2222-4222-8222-222222222222')->'accountability'->>'habit_completion_pct')::numeric,0::numeric,'Zero of seven is zero percent');
update public.habits set created_at=(current_date-2)::timestamp at time zone 'UTC' where id='94444444-4444-4444-8444-444444444444';
select is((select sum((d->>'habitAvailable')::int) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222')->'days') d),3::bigint,'Created mid-window: only three opportunities');
update public.habits set is_active=false where id='94444444-4444-4444-8444-444444444444';
select is((select sum((d->>'habitAvailable')::int) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222')->'days') d),0::bigint,'Inactive habits excluded from active cohort');
update public.habits set is_active=true,frequency='weekly' where id='94444444-4444-4444-8444-444444444444';
select is((select sum((d->>'habitAvailable')::int) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222')->'days') d),0::bigint,'Weekly targets are not daily score opportunities');
-- A rolling 168-hour query used to include eight local dates. Seed eight
-- calendar dates across the spring DST transition, then retain only seven.
insert into public.food_logs(user_id,food_name_snapshot,meal_type,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,logged_at)
select '92222222-2222-4222-8222-222222222222','Window fixture','breakfast',1,1,'serving',100,1,1,1,('2026-03-09 01:00Z'::timestamptz-i*interval '1 day') from generate_series(0,7) i;
select is((select count(distinct d->>'date') from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222','2026-03-09 15:00Z')->'days') d),7::bigint,'UTC exactly seven local dates');
select is((select count(*) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222','2026-03-09 15:00Z')->'days') d where (d->>'logged')::boolean),7::bigint,'UTC excludes eighth logged date');
update public.profiles set timezone='Asia/Manila' where id='92222222-2222-4222-8222-222222222222';
select is((select count(distinct d->>'date') from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222','2026-03-09 15:00Z')->'days') d),7::bigint,'Manila exactly seven local dates');
update public.profiles set timezone='America/Chicago' where id='92222222-2222-4222-8222-222222222222';
select is((select count(distinct d->>'date') from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222','2026-03-09 15:00Z')->'days') d),7::bigint,'Chicago DST exactly seven local dates');
select is((private.accountability_score_input('92222222-2222-4222-8222-222222222222','2026-03-09 15:00Z')->'days'->0->>'date'),'2026-03-03','Chicago starts six local days before today');
select is((select sum((d->>'calories')::numeric) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222','2026-03-09 15:00Z')->'days') d),600::numeric,'Chicago includes six populated dates and one empty date');
-- Creation on the far side of UTC midnight uses the client timezone.
update public.habits set frequency='daily',created_at='2026-03-04 02:00Z' where id='94444444-4444-4444-8444-444444444444';
select is((select sum((d->>'habitAvailable')::int) from jsonb_array_elements(private.accountability_score_input('92222222-2222-4222-8222-222222222222','2026-03-09 15:00Z')->'days') d),7::bigint,'Chicago creation date is March 3, not UTC March 4');
set local role anon;
select throws_ok($$select public.get_accountability_score_input()$$,'42501',null,'Anonymous score RPC denied');
reset role;
select * from finish();
rollback;
