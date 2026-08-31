begin;
select plan(9);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated', 'goals-a@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'authenticated', 'authenticated', 'goals-b@example.test', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 95, 82, 178, 'moderately_active', 1800, 140, 180, 60, 2500, 10000);
select is((select count(*)::int from public.user_goals), 1, 'A reads own goal');

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 80, 75, 170, 'lightly_active', 1700, 120, 160, 55, 2200, 8000);
select is((select count(*)::int from public.user_goals), 1, 'B reads own goal');
select is((select user_id from public.user_goals), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid, 'B cannot read A goal');

update public.user_goals set goal_weight = 74 where user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
select is((select goal_weight from public.user_goals), 74::numeric, 'B updates own goal');
update public.user_goals set goal_weight = 1 where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select is((select count(*)::int from public.user_goals where goal_weight = 1), 0, 'B cannot update A goal');

select throws_ok($$insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 90, 80, 175, 'sedentary', 1600, 100, 150, 50, 2000, 5000)$$, '42501', null, 'B cannot insert for A');
select throws_ok($$insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 80, 70, 170, 'sedentary', 1600, 100, 150, 50, 2000, 5000)$$, '23505', null, 'only one active goal is allowed');

update public.user_goals set is_active = false where user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
select is((select is_active from public.user_goals), false, 'B can deactivate own goal');
insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 80, 72, 170, 'moderately_active', 1750, 125, 165, 55, 2300, 9000);
select is((select count(*)::int from public.user_goals where is_active), 1, 'B can create a replacement active goal');

select * from finish();
rollback;
