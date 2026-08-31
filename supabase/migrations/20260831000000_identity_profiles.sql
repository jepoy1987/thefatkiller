create type public.unit_system as enum ('metric', 'imperial');
create type public.app_role as enum ('user', 'coach', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  date_of_birth date check (date_of_birth is null or date_of_birth <= current_date),
  sex text check (char_length(sex) <= 30),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  locale text not null default 'en' check (char_length(locale) between 1 and 16),
  unit_system public.unit_system not null default 'metric',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Authorization is deliberately separate from editable profile data.
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, display_name, avatar_url, date_of_birth, sex, timezone, locale, unit_system, onboarding_completed) on public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger user_roles_set_updated_at before update on public.user_roles
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, display_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), '')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
