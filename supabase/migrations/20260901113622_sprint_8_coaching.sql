create type public.coach_relationship_status as enum ('invited', 'active', 'paused', 'ended');
create type public.coach_goal_category as enum ('nutrition', 'hydration', 'movement', 'sleep', 'mindset', 'progress', 'accountability', 'custom');
create type public.coach_goal_status as enum ('active', 'completed', 'archived');
create type public.coach_goal_priority as enum ('low', 'normal', 'high');

create table public.coach_client_relationships (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  status public.coach_relationship_status not null default 'invited',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coach_user_id <> client_user_id),
  unique (id, coach_user_id, client_user_id),
  check ((status = 'ended' and ended_at is not null) or status <> 'ended')
);
create unique index coach_relationships_current_pair_idx on public.coach_client_relationships (coach_user_id, client_user_id) where status in ('invited', 'active');
create index coach_relationships_coach_status_idx on public.coach_client_relationships (coach_user_id, status);
create index coach_relationships_client_status_idx on public.coach_client_relationships (client_user_id, status);

create table public.coaching_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_progress boolean not null default true,
  share_nutrition boolean not null default true,
  share_accountability boolean not null default true,
  share_glp1_summary boolean not null default false,
  share_glp1_details boolean not null default false,
  updated_at timestamptz not null default now(),
  check (not share_glp1_details)
);

create table public.coach_goals (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id uuid not null,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text check (description is null or char_length(description) <= 1000),
  category public.coach_goal_category not null,
  target_date date,
  status public.coach_goal_status not null default 'active',
  priority public.coach_goal_priority not null default 'normal',
  client_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (relationship_id, coach_user_id, client_user_id)
    references public.coach_client_relationships (id, coach_user_id, client_user_id) on delete cascade,
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);
create index coach_goals_relationship_idx on public.coach_goals (relationship_id);
create index coach_goals_client_status_idx on public.coach_goals (client_user_id, status, target_date);
create index coach_goals_coach_status_idx on public.coach_goals (coach_user_id, status);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id uuid not null,
  note text not null check (char_length(trim(note)) between 3 and 2000),
  client_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (relationship_id, coach_user_id, client_user_id)
    references public.coach_client_relationships (id, coach_user_id, client_user_id) on delete cascade
);
create index coach_notes_relationship_created_idx on public.coach_notes (relationship_id, created_at desc);
create index coach_notes_client_created_idx on public.coach_notes (client_user_id, created_at desc);

alter table public.coach_client_relationships enable row level security;
alter table public.coaching_privacy_settings enable row level security;
alter table public.coach_goals enable row level security;
alter table public.coach_notes enable row level security;
revoke all on public.coach_client_relationships, public.coaching_privacy_settings, public.coach_goals, public.coach_notes from anon, authenticated;
grant select on public.coach_client_relationships, public.coach_goals, public.coach_notes to authenticated;
grant select, insert, update on public.coaching_privacy_settings to authenticated;

create function private.current_user_has_coach_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.user_subscriptions us on us.user_id = ur.user_id
    join public.plans p on p.id = us.plan_id and p.is_active
    join public.plan_entitlements pe on pe.plan_id = p.id and pe.enabled
    join public.features f on f.id = pe.feature_id and f.code = 'coach_access'
    where ur.user_id = auth.uid() and ur.role = 'coach'
      and us.status in ('active', 'trialing')
      and (us.current_period_end is null or us.current_period_end > now())
      and (us.status <> 'trialing' or us.trial_ends_at is null or us.trial_ends_at > now())
  );
$$;
revoke all on function private.current_user_has_coach_access() from public, anon, authenticated;
grant execute on function private.current_user_has_coach_access() to authenticated;

create function private.can_coach_client(target_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_user_is_admin() or (
    private.current_user_has_coach_access() and exists (
      select 1 from public.coach_client_relationships r
      where r.coach_user_id = auth.uid() and r.client_user_id = target_client_id and r.status = 'active'
    )
  );
$$;
revoke all on function private.can_coach_client(uuid) from public, anon, authenticated;
grant execute on function private.can_coach_client(uuid) to authenticated;

create policy "coach_relationships_select_participant" on public.coach_client_relationships for select to authenticated
using (coach_user_id = (select auth.uid()) or client_user_id = (select auth.uid()) or (select private.current_user_is_admin()));
create policy "coaching_privacy_select_own" on public.coaching_privacy_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "coaching_privacy_insert_own" on public.coaching_privacy_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "coaching_privacy_update_own" on public.coaching_privacy_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "coach_goals_select_bounded" on public.coach_goals for select to authenticated
using ((client_user_id = (select auth.uid()) and client_visible) or (coach_user_id = (select auth.uid()) and (select private.can_coach_client(client_user_id))) or (select private.current_user_is_admin()));
create policy "coach_notes_select_bounded" on public.coach_notes for select to authenticated
using ((client_user_id = (select auth.uid()) and client_visible) or (coach_user_id = (select auth.uid()) and (select private.can_coach_client(client_user_id))) or (select private.current_user_is_admin()));

create trigger coach_relationships_set_updated_at before update on public.coach_client_relationships for each row execute function public.set_updated_at();
create trigger coaching_privacy_set_updated_at before update on public.coaching_privacy_settings for each row execute function public.set_updated_at();
create trigger coach_goals_set_updated_at before update on public.coach_goals for each row execute function public.set_updated_at();
create trigger coach_notes_set_updated_at before update on public.coach_notes for each row execute function public.set_updated_at();

create function public.get_current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.user_roles where user_id = auth.uid();
$$;
revoke all on function public.get_current_app_role() from public, anon;
grant execute on function public.get_current_app_role() to authenticated;

create function public.admin_grant_coach_role(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.current_user_is_admin() then raise exception 'Admin role required' using errcode='42501'; end if;
  if target_user_id = auth.uid() then raise exception 'Use a dedicated coach account' using errcode='22023'; end if;
  update public.user_roles set role = 'coach' where user_id = target_user_id and role = 'user';
  if not found then raise exception 'Target must currently have user role' using errcode='22023'; end if;
end; $$;
revoke all on function public.admin_grant_coach_role(uuid) from public, anon;
grant execute on function public.admin_grant_coach_role(uuid) to authenticated;

create function public.admin_assign_coach_client(target_coach_user_id uuid, target_client_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if auth.uid() is null or not private.current_user_is_admin() then raise exception 'Admin role required' using errcode='42501'; end if;
  if not exists (select 1 from public.user_roles where user_id=target_coach_user_id and role='coach') then raise exception 'Coach role required' using errcode='22023'; end if;
  if not exists (select 1 from public.user_roles where user_id=target_client_user_id and role='user') then raise exception 'Client user role required' using errcode='22023'; end if;
  insert into public.coach_client_relationships (coach_user_id, client_user_id, status, started_at)
  values (target_coach_user_id, target_client_user_id, 'active', now()) returning id into saved_id;
  insert into public.coaching_privacy_settings (user_id) values (target_client_user_id) on conflict (user_id) do nothing;
  return saved_id;
end; $$;
revoke all on function public.admin_assign_coach_client(uuid,uuid) from public, anon;
grant execute on function public.admin_assign_coach_client(uuid,uuid) to authenticated;

create function public.get_coach_client_summary(client_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; privacy public.coaching_privacy_settings; local_today date;
begin
  if auth.uid() is null or not private.can_coach_client(client_id) then raise exception 'Active coaching relationship required' using errcode='42501'; end if;
  select * into privacy from public.coaching_privacy_settings where user_id=client_id;
  select (now() at time zone p.timezone)::date into local_today from public.profiles p where p.id=client_id;
  select jsonb_build_object(
    'client_id', p.id, 'display_name', coalesce(p.display_name,p.first_name,'Client'), 'unit_system', p.unit_system, 'timezone', p.timezone,
    'goal', case when privacy.share_progress then (select jsonb_build_object('goal_type',g.goal_type,'starting_weight',g.starting_weight,'goal_weight',g.goal_weight) from public.user_goals g where g.user_id=client_id and g.is_active limit 1) end,
    'progress', case when privacy.share_progress then jsonb_build_object(
      'latest_weight',(select w.weight_kg from public.weight_entries w where w.user_id=client_id order by w.recorded_at desc limit 1),
      'last_weigh_in',(select w.recorded_at from public.weight_entries w where w.user_id=client_id order by w.recorded_at desc limit 1),
      'change_7d',(select round((newest.weight_kg-oldest.weight_kg)::numeric,2) from (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= now()-interval '7 days' order by recorded_at desc limit 1) newest cross join (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= now()-interval '7 days' order by recorded_at limit 1) oldest),
      'change_30d',(select round((newest.weight_kg-oldest.weight_kg)::numeric,2) from (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= now()-interval '30 days' order by recorded_at desc limit 1) newest cross join (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= now()-interval '30 days' order by recorded_at limit 1) oldest)
    ) end,
    'nutrition', case when privacy.share_nutrition then jsonb_build_object(
      'logged_days_7d',(select count(distinct (f.logged_at at time zone p.timezone)::date) from public.food_logs f where f.user_id=client_id and f.logged_at>=now()-interval '7 days'),
      'protein_days_7d',(select count(*) from (select (f.logged_at at time zone p.timezone)::date d from public.food_logs f join public.user_goals g on g.user_id=client_id and g.is_active where f.user_id=client_id and f.logged_at>=now()-interval '7 days' group by d,g.daily_protein_target having sum(f.protein_g)>=g.daily_protein_target*.85) x),
      'water_days_7d',(select count(*) from (select (w.logged_at at time zone p.timezone)::date d from public.water_logs w join public.user_goals g on g.user_id=client_id and g.is_active where w.user_id=client_id and w.logged_at>=now()-interval '7 days' group by d,g.daily_water_target having sum(w.amount_ml)>=g.daily_water_target*.85) x)
    ) end,
    'accountability', case when privacy.share_accountability then jsonb_build_object(
      'habit_completion_pct',(select coalesce(round(100.0*count(*) filter(where hc.id is not null)/nullif(count(*),0)),0) from public.habits h left join public.habit_completions hc on hc.habit_id=h.id and hc.completed_on between local_today-6 and local_today where h.user_id=client_id and h.is_active),
      'check_in_days_7d',(select count(*) from public.daily_check_ins d where d.user_id=client_id and d.check_in_date between local_today-6 and local_today),
      'last_check_in',(select max(d.check_in_date) from public.daily_check_ins d where d.user_id=client_id)
    ) end,
    'glp1_summary', case when privacy.share_glp1_summary then jsonb_build_object(
      'active_medication',(select m.medication_name from public.glp1_medication_profiles m where m.user_id=client_id and m.is_active order by m.updated_at desc limit 1),
      'last_journal_entry',(select greatest((select max(d.taken_at) from public.glp1_dose_logs d where d.user_id=client_id),(select max(s.logged_at) from public.glp1_symptom_logs s where s.user_id=client_id))),
      'recent_symptom_log_exists',exists(select 1 from public.glp1_symptom_logs s where s.user_id=client_id and s.logged_at>=now()-interval '7 days')
    ) end
  ) into result from public.profiles p where p.id=client_id;
  return result;
end; $$;
revoke all on function public.get_coach_client_summary(uuid) from public, anon;
grant execute on function public.get_coach_client_summary(uuid) to authenticated;

create function public.get_coach_dashboard()
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
declare relation record;
begin
  if auth.uid() is null or not (private.current_user_is_admin() or private.current_user_has_coach_access()) then raise exception 'Coach access required' using errcode='42501'; end if;
  for relation in select r.client_user_id from public.coach_client_relationships r where r.status='active' and (private.current_user_is_admin() or r.coach_user_id=auth.uid()) order by r.created_at loop
    return next public.get_coach_client_summary(relation.client_user_id);
  end loop;
end; $$;
revoke all on function public.get_coach_dashboard() from public, anon;
grant execute on function public.get_coach_dashboard() to authenticated;

create function public.get_client_coaching_summary()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'relationship', to_jsonb(r),
    'coach_name', coalesce(p.display_name,p.first_name,'Your coach'),
    'active_goal_count', (select count(*) from public.coach_goals g where g.relationship_id=r.id and g.client_user_id=auth.uid() and g.client_visible and g.status='active'),
    'next_target_date', (select min(g.target_date) from public.coach_goals g where g.relationship_id=r.id and g.client_user_id=auth.uid() and g.client_visible and g.status='active')
  )
  from public.coach_client_relationships r join public.profiles p on p.id=r.coach_user_id
  where r.client_user_id=auth.uid() and r.status='active' order by r.started_at desc limit 1;
$$;
revoke all on function public.get_client_coaching_summary() from public, anon;
grant execute on function public.get_client_coaching_summary() to authenticated;

create function public.save_coach_goal(p_client_id uuid, p_title text, p_description text, p_category public.coach_goal_category, p_target_date date, p_priority public.coach_goal_priority, p_client_visible boolean)
returns public.coach_goals language plpgsql security definer set search_path = '' as $$
declare relation_id uuid; saved public.coach_goals;
begin
  if not private.can_coach_client(p_client_id) then raise exception 'Active coaching relationship required' using errcode='42501'; end if;
  if private.current_user_is_admin() then raise exception 'Admin support access cannot author coach goals' using errcode='42501'; end if;
  select id into relation_id from public.coach_client_relationships where coach_user_id=auth.uid() and client_user_id=p_client_id and status='active';
  insert into public.coach_goals(coach_user_id,client_user_id,relationship_id,title,description,category,target_date,priority,client_visible)
  values(auth.uid(),p_client_id,relation_id,trim(p_title),nullif(trim(p_description),''),p_category,p_target_date,p_priority,p_client_visible) returning * into saved;
  return saved;
end; $$;
revoke all on function public.save_coach_goal(uuid,text,text,public.coach_goal_category,date,public.coach_goal_priority,boolean) from public, anon;
grant execute on function public.save_coach_goal(uuid,text,text,public.coach_goal_category,date,public.coach_goal_priority,boolean) to authenticated;

create function public.set_coach_goal_status(p_goal_id uuid, p_status public.coach_goal_status)
returns public.coach_goals language plpgsql security definer set search_path = '' as $$
declare saved public.coach_goals;
begin
  if p_status not in ('completed','archived') then raise exception 'Invalid status transition' using errcode='22023'; end if;
  update public.coach_goals g set status=p_status, completed_at=case when p_status='completed' then now() else null end
  where g.id=p_goal_id and g.coach_user_id=auth.uid() and private.can_coach_client(g.client_user_id) returning * into saved;
  if saved.id is null then raise exception 'Goal not found' using errcode='P0002'; end if;
  return saved;
end; $$;
revoke all on function public.set_coach_goal_status(uuid,public.coach_goal_status) from public, anon;
grant execute on function public.set_coach_goal_status(uuid,public.coach_goal_status) to authenticated;

create function public.save_coach_note(p_client_id uuid, p_note text, p_client_visible boolean)
returns public.coach_notes language plpgsql security definer set search_path = '' as $$
declare relation_id uuid; saved public.coach_notes;
begin
  if not private.can_coach_client(p_client_id) or private.current_user_is_admin() then raise exception 'Active coach access required' using errcode='42501'; end if;
  select id into relation_id from public.coach_client_relationships where coach_user_id=auth.uid() and client_user_id=p_client_id and status='active';
  insert into public.coach_notes(coach_user_id,client_user_id,relationship_id,note,client_visible)
  values(auth.uid(),p_client_id,relation_id,trim(p_note),p_client_visible) returning * into saved;
  return saved;
end; $$;
revoke all on function public.save_coach_note(uuid,text,boolean) from public, anon;
grant execute on function public.save_coach_note(uuid,text,boolean) to authenticated;
