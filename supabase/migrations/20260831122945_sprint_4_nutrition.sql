create type public.food_source as enum ('manual', 'system', 'provider', 'barcode');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table public.foods (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120), brand text check (brand is null or char_length(brand) <= 120),
  source public.food_source not null default 'manual', external_id text,
  serving_size numeric(9,2) not null check (serving_size > 0), serving_unit text not null check (serving_unit in ('g','ml','oz','cup','tbsp','tsp','piece','serving','other')),
  calories numeric(9,2) not null check (calories >= 0), protein_g numeric(9,2) not null check (protein_g >= 0), carbs_g numeric(9,2) not null check (carbs_g >= 0), fat_g numeric(9,2) not null check (fat_g >= 0),
  fiber_g numeric(9,2) check (fiber_g is null or fiber_g >= 0), sugar_g numeric(9,2) check (sugar_g is null or sugar_g >= 0), sodium_mg numeric(10,2) check (sodium_mg is null or sodium_mg >= 0),
  is_favorite boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((owner_user_id is not null and source = 'manual') or (owner_user_id is null and source <> 'manual'))
);
create index foods_owner_name_idx on public.foods (owner_user_id, lower(name));
create unique index foods_source_external_idx on public.foods (source, external_id) where external_id is not null;

create table public.food_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null, meal_type public.meal_type not null,
  food_name_snapshot text not null check (char_length(trim(food_name_snapshot)) between 1 and 120), brand_snapshot text,
  servings numeric(9,2) not null check (servings > 0), serving_size_snapshot numeric(9,2) not null check (serving_size_snapshot > 0), serving_unit_snapshot text not null,
  calories numeric(10,2) not null check (calories >= 0), protein_g numeric(10,2) not null check (protein_g >= 0), carbs_g numeric(10,2) not null check (carbs_g >= 0), fat_g numeric(10,2) not null check (fat_g >= 0), fiber_g numeric(10,2) check (fiber_g is null or fiber_g >= 0),
  logged_at timestamptz not null default now(), notes text check (notes is null or char_length(notes) <= 500), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index food_logs_user_logged_idx on public.food_logs (user_id, logged_at desc);
create index food_logs_user_meal_logged_idx on public.food_logs (user_id, meal_type, logged_at desc);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120), description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index saved_meals_user_name_idx on public.saved_meals (user_id, lower(name));

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(), saved_meal_id uuid not null references public.saved_meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null, food_name_snapshot text not null,
  servings numeric(9,2) not null check (servings > 0), serving_size_snapshot numeric(9,2) not null check (serving_size_snapshot > 0), serving_unit_snapshot text not null,
  calories numeric(9,2) not null check (calories >= 0), protein_g numeric(9,2) not null check (protein_g >= 0), carbs_g numeric(9,2) not null check (carbs_g >= 0), fat_g numeric(9,2) not null check (fat_g >= 0),
  position integer not null default 0 check (position >= 0), created_at timestamptz not null default now()
);
create index saved_meal_items_meal_position_idx on public.saved_meal_items (saved_meal_id, position);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml numeric(10,2) not null check (amount_ml > 0), logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index water_logs_user_logged_idx on public.water_logs (user_id, logged_at desc);

alter table public.foods enable row level security; alter table public.food_logs enable row level security;
alter table public.saved_meals enable row level security; alter table public.saved_meal_items enable row level security; alter table public.water_logs enable row level security;
revoke all on public.foods, public.food_logs, public.saved_meals, public.saved_meal_items, public.water_logs from anon, authenticated;
grant select, insert, update, delete on public.foods, public.food_logs, public.saved_meals, public.saved_meal_items, public.water_logs to authenticated;

create policy "foods_select_available" on public.foods for select to authenticated using (owner_user_id = (select auth.uid()) or (owner_user_id is null and source <> 'manual'));
create policy "foods_insert_own" on public.foods for insert to authenticated with check (owner_user_id = (select auth.uid()) and source = 'manual');
create policy "foods_update_own" on public.foods for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()) and source = 'manual');
create policy "foods_delete_own" on public.foods for delete to authenticated using (owner_user_id = (select auth.uid()));
create policy "food_logs_select_own" on public.food_logs for select to authenticated using (user_id = (select auth.uid()));
create policy "food_logs_insert_own" on public.food_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "food_logs_update_own" on public.food_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "food_logs_delete_own" on public.food_logs for delete to authenticated using (user_id = (select auth.uid()));
create policy "saved_meals_select_own" on public.saved_meals for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_meals_insert_own" on public.saved_meals for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_meals_update_own" on public.saved_meals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_meals_delete_own" on public.saved_meals for delete to authenticated using (user_id = (select auth.uid()));
create policy "saved_meal_items_select_own" on public.saved_meal_items for select to authenticated using (exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = (select auth.uid())));
create policy "saved_meal_items_insert_own" on public.saved_meal_items for insert to authenticated with check (exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = (select auth.uid())));
create policy "saved_meal_items_update_own" on public.saved_meal_items for update to authenticated using (exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = (select auth.uid())));
create policy "saved_meal_items_delete_own" on public.saved_meal_items for delete to authenticated using (exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = (select auth.uid())));
create policy "water_logs_select_own" on public.water_logs for select to authenticated using (user_id = (select auth.uid()));
create policy "water_logs_insert_own" on public.water_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "water_logs_update_own" on public.water_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "water_logs_delete_own" on public.water_logs for delete to authenticated using (user_id = (select auth.uid()));

create trigger foods_set_updated_at before update on public.foods for each row execute function public.set_updated_at();
create trigger food_logs_set_updated_at before update on public.food_logs for each row execute function public.set_updated_at();
create trigger saved_meals_set_updated_at before update on public.saved_meals for each row execute function public.set_updated_at();
create trigger water_logs_set_updated_at before update on public.water_logs for each row execute function public.set_updated_at();

create function public.get_daily_nutrition(p_date date)
returns table (calories numeric, protein_g numeric, carbs_g numeric, fat_g numeric, water_ml numeric)
language sql security invoker set search_path = '' stable as $$
  with bounds as (
    select (p_date::timestamp at time zone p.timezone) as starts_at,
           ((p_date + 1)::timestamp at time zone p.timezone) as ends_at
    from public.profiles p where p.id = (select auth.uid())
  ), food as (
    select coalesce(sum(f.calories),0) calories, coalesce(sum(f.protein_g),0) protein_g,
      coalesce(sum(f.carbs_g),0) carbs_g, coalesce(sum(f.fat_g),0) fat_g
    from public.food_logs f cross join bounds b where f.user_id = (select auth.uid()) and f.logged_at >= b.starts_at and f.logged_at < b.ends_at
  ), water as (
    select coalesce(sum(w.amount_ml),0) water_ml from public.water_logs w cross join bounds b
    where w.user_id = (select auth.uid()) and w.logged_at >= b.starts_at and w.logged_at < b.ends_at
  ) select food.calories, food.protein_g, food.carbs_g, food.fat_g, water.water_ml from food cross join water;
$$;
revoke all on function public.get_daily_nutrition(date) from public, anon; grant execute on function public.get_daily_nutrition(date) to authenticated;

create function public.log_saved_meal(p_saved_meal_id uuid, p_meal_type public.meal_type, p_logged_at timestamptz)
returns setof public.food_logs language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists (select 1 from public.saved_meals where id=p_saved_meal_id and user_id=current_user_id) then raise exception 'Saved meal not found' using errcode='P0002'; end if;
  return query insert into public.food_logs (user_id,food_id,meal_type,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,logged_at)
    select current_user_id,i.food_id,p_meal_type,i.food_name_snapshot,i.servings,i.serving_size_snapshot,i.serving_unit_snapshot,
      round(i.calories*i.servings,2),round(i.protein_g*i.servings,2),round(i.carbs_g*i.servings,2),round(i.fat_g*i.servings,2),p_logged_at
    from public.saved_meal_items i where i.saved_meal_id=p_saved_meal_id order by i.position returning *;
end; $$;
revoke all on function public.log_saved_meal(uuid, public.meal_type, timestamptz) from public, anon; grant execute on function public.log_saved_meal(uuid, public.meal_type, timestamptz) to authenticated;
