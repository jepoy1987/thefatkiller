create type public.progress_source as enum ('manual', 'import', 'apple_health', 'health_connect', 'coach');
create type public.measurement_type as enum ('waist', 'hips', 'chest', 'neck', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'body_fat');
create type public.progress_photo_type as enum ('front', 'side', 'back', 'other');
create type public.milestone_type as enum ('first_weight', 'five_weights', 'goal_reached');

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(7, 2) not null check (weight_kg > 0),
  recorded_at timestamptz not null default now(),
  source public.progress_source not null default 'manual',
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index weight_entries_user_recorded_idx on public.weight_entries (user_id, recorded_at desc);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measurement_type public.measurement_type not null,
  value numeric(7, 2) not null check (value >= 0),
  recorded_at timestamptz not null default now(),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index body_measurements_user_type_recorded_idx on public.body_measurements (user_id, measurement_type, recorded_at desc);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique check (storage_path <> ''),
  photo_type public.progress_photo_type not null default 'other',
  recorded_at timestamptz not null default now(),
  weight_kg numeric(7, 2) check (weight_kg is null or weight_kg > 0),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index progress_photos_user_recorded_idx on public.progress_photos (user_id, recorded_at desc);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_type public.milestone_type not null,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, milestone_type)
);
create index milestones_user_achieved_idx on public.milestones (user_id, achieved_at desc);

alter table public.weight_entries enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.milestones enable row level security;

revoke all on public.weight_entries, public.body_measurements, public.progress_photos, public.milestones from anon, authenticated;
grant select, insert, update, delete on public.weight_entries, public.body_measurements to authenticated;
grant select, insert, delete on public.progress_photos to authenticated;
grant select on public.milestones to authenticated;

create policy "weight_entries_select_own" on public.weight_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "weight_entries_insert_own" on public.weight_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "weight_entries_update_own" on public.weight_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weight_entries_delete_own" on public.weight_entries for delete to authenticated using ((select auth.uid()) = user_id);
create policy "body_measurements_select_own" on public.body_measurements for select to authenticated using ((select auth.uid()) = user_id);
create policy "body_measurements_insert_own" on public.body_measurements for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "body_measurements_update_own" on public.body_measurements for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "body_measurements_delete_own" on public.body_measurements for delete to authenticated using ((select auth.uid()) = user_id);
create policy "progress_photos_select_own" on public.progress_photos for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress_photos_insert_own" on public.progress_photos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress_photos_delete_own" on public.progress_photos for delete to authenticated using ((select auth.uid()) = user_id);
create policy "milestones_select_own" on public.milestones for select to authenticated using ((select auth.uid()) = user_id);

create trigger weight_entries_set_updated_at before update on public.weight_entries for each row execute function public.set_updated_at();
create trigger body_measurements_set_updated_at before update on public.body_measurements for each row execute function public.set_updated_at();

create function public.sync_progress_milestones()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user uuid := coalesce(new.user_id, old.user_id); entry_count integer; latest_weight numeric; active_goal public.user_goals;
begin
  select count(*), (array_agg(weight_kg order by recorded_at desc))[1] into entry_count, latest_weight
  from public.weight_entries where user_id = target_user;
  if entry_count >= 1 then insert into public.milestones (user_id, milestone_type) values (target_user, 'first_weight') on conflict do nothing; end if;
  if entry_count >= 5 then insert into public.milestones (user_id, milestone_type) values (target_user, 'five_weights') on conflict do nothing; end if;
  select * into active_goal from public.user_goals where user_id = target_user and is_active limit 1;
  if latest_weight is not null and active_goal.id is not null and
     ((active_goal.goal_type = 'lose_weight' and latest_weight <= active_goal.goal_weight) or
      (active_goal.goal_type = 'gain_weight' and latest_weight >= active_goal.goal_weight) or
      (active_goal.goal_type = 'maintain_weight' and abs(latest_weight - active_goal.goal_weight) <= 0.5))
  then insert into public.milestones (user_id, milestone_type) values (target_user, 'goal_reached') on conflict do nothing; end if;
  return null;
end; $$;
revoke all on function public.sync_progress_milestones() from public, anon, authenticated;
create trigger weight_entries_sync_milestones after insert or update or delete on public.weight_entries for each row execute function public.sync_progress_milestones();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "progress_photos_objects_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress_photos_objects_select_own" on storage.objects for select to authenticated
using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress_photos_objects_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
