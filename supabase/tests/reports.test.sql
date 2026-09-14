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
select u.id::uuid,p.id,'active','internal' from (values('91111111-1111-4111-8111-111111111111','premium'),('92222222-2222-4222-8222-222222222222','premium'),('93333333-3333-4333-8333-333333333333','coach'),('94444444-4444-4444-8444-444444444444','coach'),('96666666-6666-4666-8666-666666666666','premium'))u(id,code) join public.plans p on p.code=u.code;
insert into public.coach_client_relationships(coach_user_id,client_user_id,status) values('93333333-3333-4333-8333-333333333333','91111111-1111-4111-8111-111111111111','active');

-- Every fixture and assertion rolls back, including on staging.
insert into public.coaching_privacy_settings(user_id) values('91111111-1111-4111-8111-111111111111');
update public.profiles set timezone='America/Chicago' where id='91111111-1111-4111-8111-111111111111';
insert into public.user_goals(user_id,starting_weight,goal_weight,height,activity_level,daily_calorie_target,daily_protein_target,daily_carbs_target,daily_fat_target,daily_water_target,daily_step_target)
values('91111111-1111-4111-8111-111111111111',90,80,175,'lightly_active',2000,150,200,65,2500,8000);
insert into public.weight_entries(user_id,weight_kg,recorded_at,notes) values
('91111111-1111-4111-8111-111111111111',99,'2026-03-01 23:59-06','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111',90,'2026-03-02 00:00-06','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111',89,'2026-03-08 23:59-05','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111',70,'2026-03-09 00:00-05','PRIVATE_SENTINEL');
insert into public.food_logs(user_id,meal_type,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,logged_at,notes) values
('91111111-1111-4111-8111-111111111111','lunch','PRIVATE_FOOD',1,1,'serving',1000,100,100,20,'2026-03-08 12:00-05','PRIVATE_SENTINEL'),
('91111111-1111-4111-8111-111111111111','dinner','PRIVATE_FOOD',1,1,'serving',900,50,90,30,'2026-03-08 18:00-05','PRIVATE_SENTINEL');
insert into public.water_logs(user_id,amount_ml,logged_at) values('91111111-1111-4111-8111-111111111111',3000,'2026-03-08 12:00-05');
insert into public.habits(id,user_id,name,created_at) values('97777777-7777-4777-8777-777777777777','91111111-1111-4111-8111-111111111111','PRIVATE_HABIT','2026-03-01');
insert into public.habit_completions(habit_id,user_id,completed_on,notes) values('97777777-7777-4777-8777-777777777777','91111111-1111-4111-8111-111111111111','2026-03-08','PRIVATE_SENTINEL');
insert into public.daily_check_ins(user_id,check_in_date,notes) values('91111111-1111-4111-8111-111111111111','2026-03-08','PRIVATE_SENTINEL');
insert into public.weekly_check_ins(user_id,week_start,notes,created_at) values('91111111-1111-4111-8111-111111111111','2026-03-02','PRIVATE_SENTINEL',now());
insert into public.workout_templates(id,owner_user_id,name) values('98888888-8888-4888-8888-888888888888','93333333-3333-4333-8333-333333333333','PRIVATE_WORKOUT');
insert into public.workout_assignments(id,client_user_id,coach_user_id,relationship_id,workout_template_id,assigned_for,status,completed_at)
select '99999999-9999-4999-8999-999999999999',client_user_id,coach_user_id,id,'98888888-8888-4888-8888-888888888888','2026-03-08','completed','2026-03-08 13:00-05' from public.coach_client_relationships where client_user_id='91111111-1111-4111-8111-111111111111';
insert into public.workout_sessions(user_id,assignment_id,name_snapshot,started_at,completed_at,status) values
('91111111-1111-4111-8111-111111111111','99999999-9999-4999-8999-999999999999','PRIVATE_WORKOUT','2026-03-08 12:00-05','2026-03-08 13:00-05','completed'),
('91111111-1111-4111-8111-111111111111',null,'PRIVATE_SELF_SESSION','2026-03-08 15:00-05','2026-03-08 16:00-05','completed');
insert into public.progress_photos(user_id,storage_path,notes) values('91111111-1111-4111-8111-111111111111','91111111-1111-4111-8111-111111111111/private-test.jpg','PRIVATE_PHOTO');
set local role anon;
select throws_ok($$select public.get_report_data('2026-03-02','2026-03-08')$$,'42501',null,'Anonymous report blocked');
select throws_ok($$select public.get_report_context()$$,'42501',null,'Anonymous context blocked');
set local role authenticated;
select set_config('request.jwt.claim.sub','95555555-5555-4555-8555-555555555555',true);
select throws_ok($$select public.get_report_data('2026-03-02','2026-03-08')$$,'42501',null,'Free direct RPC blocked');
select throws_ok($$select public.get_report_context()$$,'42501',null,'Free context blocked');
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
select lives_ok($$select public.get_report_data('2026-03-02','2026-03-08')$$,'Premium own report allowed');
select throws_ok($$select public.get_report_data('2026-03-02','2026-03-08','92222222-2222-4222-8222-222222222222')$$,'42501',null,'Owner cannot read another owner');
select throws_ok($$select private.report_context('92222222-2222-4222-8222-222222222222')$$,'42501',null,'Private arbitrary-user context blocked');
select throws_ok($$select private.report_period_data('92222222-2222-4222-8222-222222222222','2026-03-02','2026-03-08','{}')$$,'42501',null,'Private raw aggregation blocked');
select set_config('qa.report',public.get_report_data('2026-03-02','2026-03-08')::text,true);
select is(jsonb_array_length(current_setting('qa.report')::jsonb->'current'->'days'),7,'Seven inclusive local days');
select is(current_setting('qa.report')::jsonb->'current'->'days'->0->>'date','2026-03-02','Chicago DST start date');
select is(current_setting('qa.report')::jsonb->'current'->'days'->6->>'date','2026-03-08','Chicago DST end date');
select is((select sum((d->'weight'->>'count')::int)::int from jsonb_array_elements(current_setting('qa.report')::jsonb->'current'->'days') d),2,'Chicago boundaries exclude adjacent dates across DST');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->'nutrition'->>'calories')::numeric,1900::numeric,'Food totals aggregate actual records');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->'nutrition'->>'protein')::numeric,150::numeric,'Protein totals');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->>'water')::numeric,3000::numeric,'Water total');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->'accountability'->>'completed')::int,1,'Habit completion actual record');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->'accountability'->>'available')::int,1,'Habit opportunity actual record');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->'accountability'->>'checked')::boolean,true,'Daily check-in');
select is((current_setting('qa.report')::jsonb->'current'->>'weekly_check_ins')::int,1,'Weekly check-in uses selected week even when logged later');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->'training'->>'completed')::int,2,'Owner includes self-directed sessions');
select is((current_setting('qa.report')::jsonb->'current'->'days'->6->'training'->>'assigned')::int,1,'Assignment count');
select is(current_setting('qa.report')::jsonb->'current'->'days'->0->'nutrition'->'calories','null'::jsonb,'Missing food is null, not zero');
select ok(current_setting('qa.report') not like '%PRIVATE_%','Source names and notes excluded');
select ok(current_setting('qa.report') not similar to '%(glp1|photo|billing|auth_metadata|storage_path)%','No GLP-1, photo or sensitive metadata fields');
select is(current_setting('qa.report')::jsonb->'previous'->>'start','2026-02-23','Previous equivalent period');
select is(jsonb_array_length(public.get_report_data('2026-02-07','2026-03-08')->'current'->'days'),30,'Thirty days');
select is(jsonb_array_length(public.get_report_data('2025-12-09','2026-03-08')->'current'->'days'),90,'Ninety days');
select is(public.get_report_data('2025-12-09','2026-03-08')->'previous','null'::jsonb,'No automatic ninety-day comparison');
select is(jsonb_array_length(public.get_report_data('2025-03-09','2026-03-08')->'current'->'days'),365,'Maximum range');
select throws_ok($$select public.get_report_data('2025-03-08','2026-03-08')$$,'22023',null,'Overlong range blocked');
select throws_ok($$select public.get_report_data('2026-03-09','2026-03-08')$$,'22023',null,'Reversed range blocked');
select throws_ok($$select public.get_report_data(current_date,current_date+2)$$,'22023',null,'Future end blocked');
select throws_ok($$select public.get_report_data(null,'2026-03-08')$$,'22023',null,'Null range blocked');
reset role;
select is(current_setting('qa.report')::jsonb->'current'->'score_input',private.accountability_score_input('91111111-1111-4111-8111-111111111111','2026-03-08 23:59:59.999999-05'),'Exact canonical score input at historical end');
update public.profiles set timezone='Asia/Manila' where id='91111111-1111-4111-8111-111111111111';
set local role authenticated;
select is(public.get_report_context()->>'today',(now() at time zone 'Asia/Manila')::date::text,'Manila today');
select is((select sum((d->'weight'->>'count')::int)::int from jsonb_array_elements(public.get_report_data('2026-03-02','2026-03-08')->'current'->'days') d),2,'Manila timestamp boundaries');
select set_config('request.jwt.claim.sub','93333333-3333-4333-8333-333333333333',true);
select lives_ok($$select public.get_report_data('2026-03-02','2026-03-08')$$,'Coach own report allowed');
select lives_ok($$select public.get_report_data('2026-03-02','2026-03-08','91111111-1111-4111-8111-111111111111')$$,'Active assigned coach allowed');
reset role;
update public.profiles set timezone='America/Chicago' where id='91111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('qa.coach',public.get_report_data('2026-03-02','2026-03-08','91111111-1111-4111-8111-111111111111')::text,true);
select is((current_setting('qa.coach')::jsonb->'current'->'days'->6->'training'->>'completed')::int,1,'Coach sees only sessions tied to own assignments');
select is(current_setting('qa.coach')::jsonb->'current'->'score_input',current_setting('qa.report')::jsonb->'current'->'score_input','Shared coach score equals owner input');
select is((select count(*)::int from public.progress_photos where user_id='91111111-1111-4111-8111-111111111111'),0,'No coach photo access through RLS');
select set_config('request.jwt.claim.sub','94444444-4444-4444-8444-444444444444',true);
select throws_ok($$select public.get_report_data('2026-03-02','2026-03-08','91111111-1111-4111-8111-111111111111')$$,'42501',null,'Unrelated coach blocked');
select set_config('request.jwt.claim.sub','96666666-6666-4666-8666-666666666666',true);
select throws_ok($$select public.get_report_data('2026-03-02','2026-03-08','91111111-1111-4111-8111-111111111111')$$,'42501',null,'Admin cannot bypass active coach requirement');
reset role;
update public.coaching_privacy_settings set share_progress=false,share_nutrition=false,share_accountability=false,share_glp1_summary=true where user_id='91111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','93333333-3333-4333-8333-333333333333',true);
select set_config('qa.hidden',public.get_report_data('2026-03-02','2026-03-08','91111111-1111-4111-8111-111111111111')::text,true);
select is(current_setting('qa.hidden')::jsonb->'current'->'days'->6->'weight','null'::jsonb,'Withheld progress is null');
select is(current_setting('qa.hidden')::jsonb->'current'->'days'->6->'nutrition','null'::jsonb,'Withheld nutrition is null');
select is(current_setting('qa.hidden')::jsonb->'current'->'days'->6->'water','null'::jsonb,'Withheld nutrition also withholds hydration');
select is(current_setting('qa.hidden')::jsonb->'current'->'days'->6->'accountability','null'::jsonb,'Withheld accountability is null');
select is(current_setting('qa.hidden')::jsonb->'current'->'targets'->'calories','null'::jsonb,'Targets withheld');
select is(current_setting('qa.hidden')::jsonb->'current'->'score_input','null'::jsonb,'Withheld categories suppress whole score');
select is(current_setting('qa.hidden')::jsonb->'previous'->'score_input','null'::jsonb,'Comparison cannot leak withheld score');
select ok(current_setting('qa.hidden') not like '%glp1%','Even GLP-1 sharing consent does not add medical reports');
reset role;
update public.coach_client_relationships set status='paused' where client_user_id='91111111-1111-4111-8111-111111111111';
set local role authenticated;
select throws_ok($$select public.get_report_data('2026-03-02','2026-03-08','91111111-1111-4111-8111-111111111111')$$,'42501',null,'Paused coach blocked');
reset role;
update public.coach_client_relationships set status='ended',ended_at=now() where client_user_id='91111111-1111-4111-8111-111111111111';
set local role authenticated;
select throws_ok($$select public.get_report_context('91111111-1111-4111-8111-111111111111')$$,'42501',null,'Ended relationship context blocked');
reset role;
update public.coach_client_relationships set status='active',ended_at=null where client_user_id='91111111-1111-4111-8111-111111111111';
update public.user_subscriptions set status='canceled' where user_id='93333333-3333-4333-8333-333333333333';
set local role authenticated;
select throws_ok($$select public.get_report_data('2026-03-02','2026-03-08','91111111-1111-4111-8111-111111111111')$$,'42501',null,'Expired coach entitlement blocked');
select * from finish();
rollback;
