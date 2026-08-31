create type public.habit_category as enum ('nutrition','hydration','movement','sleep','mindset','medication','custom');
create type public.habit_frequency as enum ('daily','weekly');

create table public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120), description text check (description is null or char_length(description) <= 500),
  category public.habit_category not null default 'custom', frequency public.habit_frequency not null default 'daily',
  target_per_period integer not null default 1 check (target_per_period between 1 and 100), is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index habits_user_active_sort_idx on public.habits (user_id, is_active, sort_order, created_at);

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(), habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, completed_on date not null,
  value numeric(10,2) check (value is null or value >= 0), notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(), unique (habit_id, completed_on)
);
create index habit_completions_user_date_idx on public.habit_completions (user_id, completed_on desc);
create index habit_completions_habit_date_idx on public.habit_completions (habit_id, completed_on desc);

create table public.daily_check_ins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  check_in_date date not null, mood integer check (mood between 1 and 5), energy integer check (energy between 1 and 5),
  hunger integer check (hunger between 1 and 5), sleep_quality integer check (sleep_quality between 1 and 5), stress integer check (stress between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 1000), win_of_day text check (win_of_day is null or char_length(win_of_day) <= 500),
  challenge_of_day text check (challenge_of_day is null or char_length(challenge_of_day) <= 500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, check_in_date)
);

create table public.weekly_check_ins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1), overall_rating integer check (overall_rating between 1 and 5),
  nutrition_rating integer check (nutrition_rating between 1 and 5), movement_rating integer check (movement_rating between 1 and 5), sleep_rating integer check (sleep_rating between 1 and 5),
  biggest_win text check (biggest_win is null or char_length(biggest_win) <= 500), biggest_challenge text check (biggest_challenge is null or char_length(biggest_challenge) <= 500),
  focus_next_week text check (focus_next_week is null or char_length(focus_next_week) <= 500), notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, week_start)
);

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.daily_check_ins enable row level security;
alter table public.weekly_check_ins enable row level security;
revoke all on public.habits, public.habit_completions, public.daily_check_ins, public.weekly_check_ins from anon, authenticated;
grant select, insert, update, delete on public.habits, public.habit_completions, public.daily_check_ins, public.weekly_check_ins to authenticated;

create policy "habits_select_own" on public.habits for select to authenticated using (user_id = (select auth.uid()));
create policy "habits_insert_own" on public.habits for insert to authenticated with check (user_id = (select auth.uid()));
create policy "habits_update_own" on public.habits for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "habits_delete_own" on public.habits for delete to authenticated using (user_id = (select auth.uid()));
create policy "habit_completions_select_own" on public.habit_completions for select to authenticated using (user_id = (select auth.uid()));
create policy "habit_completions_insert_own" on public.habit_completions for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));
create policy "habit_completions_update_own" on public.habit_completions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));
create policy "habit_completions_delete_own" on public.habit_completions for delete to authenticated using (user_id = (select auth.uid()));
create policy "daily_check_ins_select_own" on public.daily_check_ins for select to authenticated using (user_id = (select auth.uid()));
create policy "daily_check_ins_insert_own" on public.daily_check_ins for insert to authenticated with check (user_id = (select auth.uid()));
create policy "daily_check_ins_update_own" on public.daily_check_ins for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "daily_check_ins_delete_own" on public.daily_check_ins for delete to authenticated using (user_id = (select auth.uid()));
create policy "weekly_check_ins_select_own" on public.weekly_check_ins for select to authenticated using (user_id = (select auth.uid()));
create policy "weekly_check_ins_insert_own" on public.weekly_check_ins for insert to authenticated with check (user_id = (select auth.uid()));
create policy "weekly_check_ins_update_own" on public.weekly_check_ins for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "weekly_check_ins_delete_own" on public.weekly_check_ins for delete to authenticated using (user_id = (select auth.uid()));

create trigger habits_set_updated_at before update on public.habits for each row execute function public.set_updated_at();
create trigger daily_check_ins_set_updated_at before update on public.daily_check_ins for each row execute function public.set_updated_at();
create trigger weekly_check_ins_set_updated_at before update on public.weekly_check_ins for each row execute function public.set_updated_at();
