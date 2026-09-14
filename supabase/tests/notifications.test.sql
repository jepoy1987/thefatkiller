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

update public.habits set created_at='2025-01-01';
update public.workout_assignments set created_at='2025-01-01',status='assigned',completed_at=null,assigned_for='2026-03-08',due_at='2026-03-08 18:00-05';
insert into public.reminder_preferences(user_id,daily_check_in_time,weekly_check_in_enabled,habit_reminders_enabled,workout_reminders_enabled)
values('91111111-1111-4111-8111-111111111111','08:00',false,false,false),('92222222-2222-4222-8222-222222222222','08:00',false,false,false),('95555555-5555-4555-8555-555555555555','08:00',false,false,false);
delete from public.daily_check_ins where user_id='91111111-1111-4111-8111-111111111111';
update public.profiles set timezone='UTC' where id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 07:59Z')),0,'UTC before due');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 08:00Z')),1,'UTC due');
update public.profiles set timezone='Asia/Manila' where id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-07 23:59Z')),0,'Asia/Manila before due');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 00:00Z')),1,'Asia/Manila due');
update public.profiles set timezone='America/Chicago' where id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 12:59Z')),0,'America/Chicago before due');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 13:00Z')),1,'America/Chicago due');
update public.reminder_preferences set daily_check_in_time='02:30' where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 01:59-06')),0,'Spring DST before skipped hour');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 03:00-05')),1,'Spring DST skipped time catches up');
update public.reminder_preferences set daily_check_in_time='01:30' where user_id='91111111-1111-4111-8111-111111111111';
select is((private.generate_user_reminders('91111111-1111-4111-8111-111111111111','2025-11-02 01:30-05')->>'inserted')::int,1,'Fall first hour emits');
select is((private.generate_user_reminders('91111111-1111-4111-8111-111111111111','2025-11-02 01:30-06')->>'inserted')::int,0,'Fall repeated hour deduplicated');
update public.reminder_preferences set quiet_hours_enabled=true,quiet_hours_start='09:00',quiet_hours_end='12:00' where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 09:00-05')),0,'Same-day quiet start inclusive');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 12:00-05')),1,'Same-day quiet end exclusive');
update public.reminder_preferences set quiet_hours_start='22:00',quiet_hours_end='07:00' where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 23:00-05')),0,'Overnight quiet evening');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-09 06:59-05')),0,'Overnight quiet morning');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-09 07:00-05')),1,'Overnight resume current day only');
update public.reminder_preferences set quiet_hours_enabled=false where user_id='91111111-1111-4111-8111-111111111111';
insert into public.daily_check_ins(user_id,check_in_date) values('91111111-1111-4111-8111-111111111111','2026-03-08');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),0,'Completed daily check-in suppressed');
update public.reminder_preferences set daily_check_in_enabled=false,weekly_check_in_enabled=true,weekly_check_in_day=0,weekly_check_in_time='18:00' where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),0,'Completed weekly check-in suppressed');
delete from public.weekly_check_ins where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 17:59-05')),0,'Weekly before configured weekday time');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 18:00-05')),1,'Weekly due');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-09 18:00-05')),0,'No old-week backfill');
update public.reminder_preferences set weekly_check_in_enabled=false,weigh_in_enabled=true,weigh_in_time='08:00',weigh_in_days_of_week='{0}' where user_id='91111111-1111-4111-8111-111111111111';
insert into public.weight_entries(user_id,weight_kg,recorded_at) values('91111111-1111-4111-8111-111111111111',90,'2026-03-08 10:00-05');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),0,'Logged weigh-in suppressed');
delete from public.weight_entries where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),1,'Selected weigh-in weekday due');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-09 20:00-05')),0,'Unselected weigh-in weekday suppressed');
update public.reminder_preferences set weigh_in_enabled=false,habit_reminders_enabled=true,habit_reminder_time='18:00' where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),0,'Completed habit suppressed');
delete from public.habit_completions where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),1,'Incomplete habit reminder');
update public.habits set is_active=false where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),0,'Deactivated habit suppressed');
update public.habits set is_active=true,created_at='2026-03-09' where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 18:00-05')),0,'Future habit creation suppressed');
update public.habits set created_at='2025-01-01',frequency='weekly',target_per_period=1 where user_id='91111111-1111-4111-8111-111111111111'; insert into public.habit_completions(user_id,habit_id,completed_on) select user_id,id,'2026-03-07' from public.habits where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),0,'Weekly habit target met');
update public.reminder_preferences set habit_reminders_enabled=false,workout_reminders_enabled=true,workout_reminder_minutes_before=60 where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 16:59-05')),0,'Workout before lead time');
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 17:00-05')),1,'Workout lead-time boundary');
update public.workout_assignments set status='in_progress',completed_at=null where client_user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 18:00-05')),0,'Workout in_progress suppressed');
update public.workout_assignments set status='skipped',completed_at=null where client_user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 18:00-05')),0,'Workout skipped suppressed');
update public.workout_assignments set status='archived',completed_at=null where client_user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 18:00-05')),0,'Workout archived suppressed');
update public.workout_assignments set status='completed',completed_at=now() where client_user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 18:00-05')),0,'Workout completed suppressed');
update public.workout_assignments set status='assigned',completed_at=null where client_user_id='91111111-1111-4111-8111-111111111111';update public.coach_client_relationships set status='paused' where client_user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 18:00-05')),0,'Paused coach workout excluded');
update public.coach_client_relationships set status='active' where client_user_id='91111111-1111-4111-8111-111111111111';update public.workout_assignments set due_at=null where client_user_id='91111111-1111-4111-8111-111111111111';
update public.reminder_preferences set workout_reminder_time='09:00' where user_id='91111111-1111-4111-8111-111111111111';
select is((select count(*)::int from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 08:00-05')),1,'Date-only workout fallback and lead time');
update public.reminder_preferences set workout_reminders_enabled=false,glp1_journal_enabled=true,glp1_journal_time='20:00' where user_id='91111111-1111-4111-8111-111111111111';
select is((select message from private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')),'Remember to update your GLP-1 journal.','Tracking-only GLP-1 wording');
update public.reminder_preferences set daily_check_in_enabled=false,glp1_journal_enabled=true where user_id='95555555-5555-4555-8555-555555555555';select is((select count(*)::int from private.evaluate_due_reminders('95555555-5555-4555-8555-555555555555','2026-03-08 23:00Z')),0,'Free GLP-1 source is unentitled');
select is((select glp1_journal_enabled from public.reminder_preferences where user_id='92222222-2222-4222-8222-222222222222'),false,'GLP-1 off by default');
select is((private.generate_user_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:00-05')->>'inserted')::int,1,'Generate current logical event');select is((private.generate_user_reminders('91111111-1111-4111-8111-111111111111','2026-03-08 20:15-05')->>'duplicates')::int,1,'Second tick duplicate suppressed');
insert into public.notifications(user_id,type,title,message,dedupe_key,created_at) select '91111111-1111-4111-8111-111111111111','system','QA','QA','cap:'||i,clock_timestamp() from generate_series(1,20) i;select is((private.generate_user_reminders('91111111-1111-4111-8111-111111111111','2026-03-09 20:00-05')->>'inserted')::int,0,'Daily rolling cap enforced');
insert into public.notifications(user_id,type,title,message,dedupe_key) values('92222222-2222-4222-8222-222222222222','system','Private','Private','private-b');
set local role anon;select throws_ok($$select public.generate_due_notifications()$$,'42501',null,'Anonymous scheduler blocked');set local role authenticated;
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
select is((select count(*)::int from public.notifications where user_id='92222222-2222-4222-8222-222222222222'),0,'Other-owner notification invisible');select is((select count(*)::int from public.reminder_preferences where user_id='92222222-2222-4222-8222-222222222222'),0,'Other-owner preferences invisible');
select throws_ok($$select public.generate_due_notifications()$$,'42501',null,'Authenticated scheduler blocked');
select throws_ok($$select private.evaluate_due_reminders('91111111-1111-4111-8111-111111111111',now())$$,'42501',null,'Private arbitrary-user evaluator blocked');
select throws_ok($$insert into public.notifications(user_id,type,title,message,dedupe_key) values('91111111-1111-4111-8111-111111111111','system','Forged','Forged','forged')$$,'42501',null,'Direct system notification insertion denied');
select throws_ok($$update public.notifications set title='Forged' where user_id='91111111-1111-4111-8111-111111111111'$$,'42501',null,'Direct notification updates denied');select throws_ok($$delete from public.notifications where user_id='91111111-1111-4111-8111-111111111111'$$,'42501',null,'Direct delete denied');
with changed as (update public.reminder_preferences set daily_check_in_enabled=true where user_id='92222222-2222-4222-8222-222222222222' returning *) select is((select count(*)::int from changed),0,'Cross-owner preference update denied');
select throws_ok($$insert into public.reminder_preferences(user_id) values('93333333-3333-4333-8333-333333333333')$$,'42501',null,'Cross-owner preference insert denied');
select ok(public.set_notification_read((select id from public.notifications where user_id='91111111-1111-4111-8111-111111111111' limit 1),true),'Mark own read');select ok(public.set_notification_read((select id from public.notifications where user_id='91111111-1111-4111-8111-111111111111' limit 1),false),'Mark own unread');select ok(public.mark_all_notifications_read()>0,'Mark all own read');select is(public.notification_unread_count(),0,'Badge clears');
reset role;select set_config('qa.other_notification',(select id::text from public.notifications where user_id='92222222-2222-4222-8222-222222222222' limit 1),true);set local role authenticated;select is(public.set_notification_read(current_setting('qa.other_notification')::uuid,true),false,'Cannot mark other owner read');
select set_config('request.jwt.claim.sub','93333333-3333-4333-8333-333333333333',true);select is((select count(*)::int from public.notifications),0,'Coach relationship grants no notification access');reset role;
insert into public.notifications(user_id,type,title,message,dedupe_key,created_at,expires_at) values('92222222-2222-4222-8222-222222222222','system','Expired','Expired','expired',now()-interval '3 days',now()-interval '1 day');set local role authenticated;select set_config('request.jwt.claim.sub','92222222-2222-4222-8222-222222222222',true);select is(public.notification_unread_count(),1,'Expired notification excluded from badge');reset role;
select is((public.generate_due_notifications()->>'errors')::int,0,'Trusted batch runs without errors');select * from finish();rollback;
