begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated', 'tfk-goals-a@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'authenticated', 'authenticated', 'tfk-goals-b@example.invalid', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 95, 82, 178, 'moderately_active', 1800, 140, 180, 60, 2500, 10000);

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 80, 75, 170, 'lightly_active', 1700, 120, 160, 55, 2200, 8000);

do $$
declare affected integer;
begin
  if (select count(*) from public.user_goals) <> 1 then raise exception 'B can read A goal'; end if;
  update public.user_goals set goal_weight = 74 where user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'B cannot update own goal'; end if;
  update public.user_goals set goal_weight = 1 where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'B updated A goal'; end if;

  begin
    insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 90, 80, 175, 'sedentary', 1600, 100, 150, 50, 2000, 5000);
    raise exception 'B inserted a goal for A';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.user_goals (user_id, starting_weight, goal_weight, height, activity_level, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_step_target)
    values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 80, 70, 170, 'sedentary', 1600, 100, 150, 50, 2000, 5000);
    raise exception 'B created a second active goal';
  exception when unique_violation then null; end;
end;
$$;

reset role;
rollback;
