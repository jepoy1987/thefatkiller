create type public.goal_type as enum ('lose_weight', 'maintain_weight', 'gain_weight');
create type public.activity_level as enum ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');

-- Measurements are canonical at rest: kilograms, centimeters, and milliliters.
-- The profile unit_system controls conversion only at input/display boundaries.
create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type public.goal_type not null default 'lose_weight',
  starting_weight numeric(7, 2) not null check (starting_weight > 0),
  goal_weight numeric(7, 2) not null check (goal_weight > 0),
  height numeric(6, 2) not null check (height > 0),
  activity_level public.activity_level not null,
  daily_calorie_target integer not null check (daily_calorie_target > 0),
  daily_protein_target numeric(7, 2) not null check (daily_protein_target >= 0),
  daily_carbs_target numeric(7, 2) not null check (daily_carbs_target >= 0),
  daily_fat_target numeric(7, 2) not null check (daily_fat_target >= 0),
  daily_water_target integer not null check (daily_water_target > 0),
  daily_step_target integer not null check (daily_step_target >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_goals_user_id_idx on public.user_goals (user_id);
create unique index user_goals_one_active_per_user_idx
on public.user_goals (user_id) where is_active = true;

alter table public.user_goals enable row level security;

revoke all on public.user_goals from anon, authenticated;
grant select, insert, update on public.user_goals to authenticated;

create policy "user_goals_select_own" on public.user_goals for select to authenticated
using ((select auth.uid()) = user_id);
create policy "user_goals_insert_own" on public.user_goals for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "user_goals_update_own" on public.user_goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create trigger user_goals_set_updated_at before update on public.user_goals
for each row execute function public.set_updated_at();

-- Completes profile and goal setup atomically and derives ownership from auth.uid().
create function public.complete_onboarding(
  p_first_name text, p_last_name text, p_display_name text, p_date_of_birth date,
  p_unit_system public.unit_system, p_goal_type public.goal_type,
  p_starting_weight numeric, p_goal_weight numeric, p_height numeric,
  p_activity_level public.activity_level, p_daily_calorie_target integer,
  p_daily_protein_target numeric, p_daily_carbs_target numeric,
  p_daily_fat_target numeric, p_daily_water_target integer, p_daily_step_target integer
)
returns public.user_goals
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_goal public.user_goals;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.profiles
  set first_name = p_first_name, last_name = p_last_name, display_name = p_display_name,
      date_of_birth = p_date_of_birth, unit_system = p_unit_system,
      onboarding_completed = true
  where id = current_user_id;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;

  insert into public.user_goals (
    user_id, goal_type, starting_weight, goal_weight, height, activity_level,
    daily_calorie_target, daily_protein_target, daily_carbs_target,
    daily_fat_target, daily_water_target, daily_step_target, is_active
  ) values (
    current_user_id, p_goal_type, p_starting_weight, p_goal_weight, p_height,
    p_activity_level, p_daily_calorie_target, p_daily_protein_target,
    p_daily_carbs_target, p_daily_fat_target, p_daily_water_target,
    p_daily_step_target, true
  )
  on conflict (user_id) where is_active = true do update
  set goal_type = excluded.goal_type, starting_weight = excluded.starting_weight,
      goal_weight = excluded.goal_weight, height = excluded.height,
      activity_level = excluded.activity_level,
      daily_calorie_target = excluded.daily_calorie_target,
      daily_protein_target = excluded.daily_protein_target,
      daily_carbs_target = excluded.daily_carbs_target,
      daily_fat_target = excluded.daily_fat_target,
      daily_water_target = excluded.daily_water_target,
      daily_step_target = excluded.daily_step_target
  returning * into saved_goal;
  return saved_goal;
end;
$$;

revoke all on function public.complete_onboarding(
  text, text, text, date, public.unit_system, public.goal_type, numeric, numeric,
  numeric, public.activity_level, integer, numeric, numeric, numeric, integer, integer
) from public, anon;
grant execute on function public.complete_onboarding(
  text, text, text, date, public.unit_system, public.goal_type, numeric, numeric,
  numeric, public.activity_level, integer, numeric, numeric, numeric, integer, integer
) to authenticated;

create function public.update_goal_settings(
  p_unit_system public.unit_system, p_goal_type public.goal_type,
  p_goal_weight numeric, p_activity_level public.activity_level,
  p_daily_calorie_target integer, p_daily_protein_target numeric,
  p_daily_carbs_target numeric, p_daily_fat_target numeric,
  p_daily_water_target integer, p_daily_step_target integer
)
returns public.user_goals
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_goal public.user_goals;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.profiles set unit_system = p_unit_system where id = current_user_id;
  update public.user_goals
  set goal_type = p_goal_type, goal_weight = p_goal_weight,
      activity_level = p_activity_level, daily_calorie_target = p_daily_calorie_target,
      daily_protein_target = p_daily_protein_target,
      daily_carbs_target = p_daily_carbs_target, daily_fat_target = p_daily_fat_target,
      daily_water_target = p_daily_water_target, daily_step_target = p_daily_step_target
  where user_id = current_user_id and is_active = true
  returning * into saved_goal;

  if saved_goal.id is null then raise exception 'Active goal not found' using errcode = 'P0002'; end if;
  return saved_goal;
end;
$$;

revoke all on function public.update_goal_settings(
  public.unit_system, public.goal_type, numeric, public.activity_level,
  integer, numeric, numeric, numeric, integer, integer
) from public, anon;
grant execute on function public.update_goal_settings(
  public.unit_system, public.goal_type, numeric, public.activity_level,
  integer, numeric, numeric, numeric, integer, integer
) to authenticated;
