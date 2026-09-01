create type public.glp1_medication as enum ('semaglutide', 'tirzepatide', 'liraglutide', 'other');
create type public.glp1_schedule as enum ('daily', 'weekly', 'other');
create type public.glp1_dose_event_type as enum ('taken', 'missed', 'skipped');
create type public.glp1_dose_unit as enum ('mg', 'mcg', 'units', 'other');
create type public.glp1_injection_site as enum ('abdomen', 'thigh', 'upper_arm', 'other', 'not_applicable');

create function public.has_current_feature(p_feature_code text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(p_feature_code = any(e.feature_codes), false)
  from public.get_current_entitlements() e;
$$;

revoke all on function public.has_current_feature(text) from public, anon, authenticated;
grant execute on function public.has_current_feature(text) to authenticated;

create table public.glp1_medication_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_name public.glp1_medication not null,
  custom_medication_name text check (custom_medication_name is null or char_length(custom_medication_name) between 1 and 100),
  is_active boolean not null default true,
  started_on date,
  prescribed_schedule public.glp1_schedule,
  usual_day_of_week integer check (usual_day_of_week between 1 and 7),
  usual_time time,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (medication_name = 'other' or custom_medication_name is null),
  check (medication_name <> 'other' or custom_medication_name is not null),
  check (prescribed_schedule = 'weekly' or usual_day_of_week is null)
);

create table public.glp1_dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_profile_id uuid not null,
  event_type public.glp1_dose_event_type not null,
  dose_amount numeric,
  dose_unit public.glp1_dose_unit,
  taken_at timestamptz not null,
  injection_site public.glp1_injection_site,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (medication_profile_id, user_id) references public.glp1_medication_profiles(id, user_id) on delete cascade,
  check (dose_amount is null or dose_amount > 0),
  check ((event_type = 'taken' and dose_amount is not null and dose_unit is not null) or
         (event_type in ('missed', 'skipped') and dose_amount is null and dose_unit is null))
);

create table public.glp1_symptom_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_profile_id uuid,
  dose_log_id uuid,
  logged_at timestamptz not null,
  appetite integer check (appetite between 1 and 5),
  hunger integer check (hunger between 1 and 5),
  nausea integer check (nausea between 1 and 5),
  constipation integer check (constipation between 1 and 5),
  diarrhea integer check (diarrhea between 1 and 5),
  reflux integer check (reflux between 1 and 5),
  fatigue integer check (fatigue between 1 and 5),
  headache integer check (headache between 1 and 5),
  abdominal_discomfort integer check (abdominal_discomfort between 1 and 5),
  other_symptoms text check (other_symptoms is null or char_length(other_symptoms) <= 500),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (medication_profile_id, user_id) references public.glp1_medication_profiles(id, user_id) on delete cascade,
  foreign key (dose_log_id, user_id) references public.glp1_dose_logs(id, user_id) on delete set null (dose_log_id),
  check (medication_profile_id is not null or dose_log_id is null)
);

create index glp1_medication_profiles_user_active_idx on public.glp1_medication_profiles (user_id, is_active);
create index glp1_dose_logs_user_taken_idx on public.glp1_dose_logs (user_id, taken_at desc);
create index glp1_dose_logs_profile_taken_idx on public.glp1_dose_logs (medication_profile_id, taken_at desc);
create index glp1_symptom_logs_user_logged_idx on public.glp1_symptom_logs (user_id, logged_at desc);
create index glp1_symptom_logs_profile_logged_idx on public.glp1_symptom_logs (medication_profile_id, logged_at desc);

create trigger glp1_medication_profiles_set_updated_at before update on public.glp1_medication_profiles
for each row execute function public.set_updated_at();
create trigger glp1_dose_logs_set_updated_at before update on public.glp1_dose_logs
for each row execute function public.set_updated_at();
create trigger glp1_symptom_logs_set_updated_at before update on public.glp1_symptom_logs
for each row execute function public.set_updated_at();

alter table public.glp1_medication_profiles enable row level security;
alter table public.glp1_dose_logs enable row level security;
alter table public.glp1_symptom_logs enable row level security;

revoke all on public.glp1_medication_profiles, public.glp1_dose_logs, public.glp1_symptom_logs from anon, authenticated;
grant select, insert, update, delete on public.glp1_medication_profiles, public.glp1_dose_logs, public.glp1_symptom_logs to authenticated;

create policy "glp1_profiles_owner_all" on public.glp1_medication_profiles for all to authenticated
using ((select auth.uid()) = user_id and (select public.has_current_feature('glp1_journal')))
with check ((select auth.uid()) = user_id and (select public.has_current_feature('glp1_journal')));

create policy "glp1_doses_owner_all" on public.glp1_dose_logs for all to authenticated
using ((select auth.uid()) = user_id and (select public.has_current_feature('glp1_journal')))
with check (
  (select auth.uid()) = user_id and (select public.has_current_feature('glp1_journal'))
  and exists (select 1 from public.glp1_medication_profiles p where p.id = medication_profile_id and p.user_id = (select auth.uid()))
);

create policy "glp1_symptoms_owner_all" on public.glp1_symptom_logs for all to authenticated
using ((select auth.uid()) = user_id and (select public.has_current_feature('glp1_journal')))
with check (
  (select auth.uid()) = user_id and (select public.has_current_feature('glp1_journal'))
  and (medication_profile_id is null or exists (
    select 1 from public.glp1_medication_profiles p where p.id = medication_profile_id and p.user_id = (select auth.uid())
  ))
  and (dose_log_id is null or exists (
    select 1 from public.glp1_dose_logs d where d.id = dose_log_id and d.user_id = (select auth.uid())
      and (medication_profile_id is null or d.medication_profile_id = medication_profile_id)
  ))
);
