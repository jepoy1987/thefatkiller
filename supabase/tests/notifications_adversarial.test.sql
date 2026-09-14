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


update public.profiles set timezone='UTC' where id='91111111-1111-4111-8111-111111111111';
insert into public.reminder_preferences(user_id,daily_check_in_enabled,weekly_check_in_enabled,habit_reminders_enabled,workout_reminders_enabled,workout_reminder_minutes_before) values('91111111-1111-4111-8111-111111111111',false,false,false,true,1440);
delete from public.workout_sessions where user_id='91111111-1111-4111-8111-111111111111';delete from public.workout_assignments where client_user_id='91111111-1111-4111-8111-111111111111';
insert into public.workout_assignments(client_user_id,coach_user_id,relationship_id,workout_template_id,due_at,created_at)
select '91111111-1111-4111-8111-111111111111',coach_user_id,id,'98888888-8888-4888-8888-888888888888','2026-03-10 09:00Z','2026-03-01' from public.coach_client_relationships cross join generate_series(1,20) where client_user_id='91111111-1111-4111-8111-111111111111';
select is((private.generate_user_reminders('91111111-1111-4111-8111-111111111111','2026-03-09 10:00Z')->>'inserted')::int,20,'20 lead-time reminders on Monday');
insert into public.workout_assignments(client_user_id,coach_user_id,relationship_id,workout_template_id,due_at,created_at)
select '91111111-1111-4111-8111-111111111111',coach_user_id,id,'98888888-8888-4888-8888-888888888888','2026-03-10 12:00Z','2026-03-09 11:00Z' from public.coach_client_relationships where client_user_id='91111111-1111-4111-8111-111111111111';
-- Advance the stored operational quota age independently of logical eligibility time.
update public.notifications set created_at=clock_timestamp()-interval '25 hours' where user_id='91111111-1111-4111-8111-111111111111';
select is((private.generate_user_reminders('91111111-1111-4111-8111-111111111111','2026-03-10 11:00Z')->>'inserted')::int,1,'New eligible workout emits after 24-hour quota is clear');
select is((select count(*)::int from public.notifications where user_id='91111111-1111-4111-8111-111111111111'),21,'All 21 logical workouts eventually notified');
-- Owner/admin isolation beyond the existing suite.
select set_config('qa.owner_notification',(select id::text from public.notifications where user_id='91111111-1111-4111-8111-111111111111' limit 1),true);
set local role authenticated;select set_config('request.jwt.claim.sub','96666666-6666-4666-8666-666666666666',true);
select is((select count(*)::int from public.notifications),0,'Admin role has no other-owner notification override');
select is(public.set_notification_read(current_setting('qa.owner_notification')::uuid,false),false,'Admin cannot mark another owner unread');
select is(public.mark_all_notifications_read(),0,'Admin mark-all affects only admin owner');
reset role;
select is((select count(*)::int from public.notifications where user_id='91111111-1111-4111-8111-111111111111' and read_at is not null),0,'Other-owner mark-all leaves rows untouched');
select * from finish();rollback;
