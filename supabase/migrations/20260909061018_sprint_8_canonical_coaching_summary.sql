-- Bounded inputs for the existing TypeScript Sprint 5 scorer. No score formula in SQL.
-- Daily opportunities start on creation's local date. Inactive habits are excluded
-- from the active-habit metric; weekly targets are not daily scoring opportunities.
create function private.accountability_score_input(target_user_id uuid, as_of timestamptz default now())
returns jsonb language sql stable security invoker set search_path = '' as $$
  with context as (
    select p.timezone, (as_of at time zone p.timezone)::date today,
      coalesce(g.daily_calorie_target,0) calories, coalesce(g.daily_protein_target,0) protein,
      coalesce(g.daily_water_target,0) water
    from public.profiles p
    left join public.user_goals g on g.user_id=p.id and g.is_active
    where p.id=target_user_id
  ), days as (
    select c.*, c.today-i date from context c cross join generate_series(0,6) i
  ), signals as (
    select d.date, jsonb_build_object(
      'date',d.date,'calorieTarget',d.calories,'proteinTarget',d.protein,'waterTarget',d.water,
      'calories',coalesce(f.calories,0),'protein',coalesce(f.protein,0),'logged',f.logged,
      'water',coalesce(w.water,0),
      'habitAvailable',h.available,'habitCompleted',h.completed,
      'checkedIn',exists(select 1 from public.daily_check_ins ci where ci.user_id=target_user_id and ci.check_in_date=d.date)
    ) value
    from days d
    cross join lateral (
      select sum(calories) calories,sum(protein_g) protein,count(*)>0 logged
      from public.food_logs where user_id=target_user_id
        and logged_at >= d.date::timestamp at time zone d.timezone
        and logged_at < (d.date+1)::timestamp at time zone d.timezone
        and logged_at <= as_of
    ) f
    cross join lateral (
      select sum(amount_ml) water from public.water_logs where user_id=target_user_id
        and logged_at >= d.date::timestamp at time zone d.timezone
        and logged_at < (d.date+1)::timestamp at time zone d.timezone
        and logged_at <= as_of
    ) w
    cross join lateral (
      select count(*) available, count(hc.id) completed
      from public.habits h left join public.habit_completions hc
        on hc.habit_id=h.id and hc.user_id=target_user_id and hc.completed_on=d.date
      where h.user_id=target_user_id and h.is_active and h.frequency='daily'
        and (h.created_at at time zone d.timezone)::date <= d.date
    ) h
  )
  select jsonb_build_object('days',(select jsonb_agg(value order by date) from signals),
    'progressLogged',exists(select 1 from public.weight_entries w where w.user_id=target_user_id
      and w.recorded_at >= (c.today-6)::timestamp at time zone c.timezone
      and w.recorded_at < (c.today+1)::timestamp at time zone c.timezone and w.recorded_at<=as_of),
    'windowDays',7)
  from context c;
$$;
revoke all on function private.accountability_score_input(uuid,timestamptz) from public,anon,authenticated;

-- Owner-only public entry point; coaches obtain only consented inputs through the
-- existing relationship-checked summary, never an arbitrary-user scoring RPC.
create function public.get_accountability_score_input()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return private.accountability_score_input(auth.uid());
end;
$$;
revoke all on function public.get_accountability_score_input() from public,anon;
grant execute on function public.get_accountability_score_input() to authenticated;

create or replace function public.get_coach_client_summary(client_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; privacy public.coaching_privacy_settings; local_today date; score_input jsonb; client_timezone text;
begin
  if auth.uid() is null or not private.can_coach_client(client_id) then raise exception 'Active coaching relationship required' using errcode='42501'; end if;
  select * into privacy from public.coaching_privacy_settings where user_id=client_id;
  select (now() at time zone p.timezone)::date,p.timezone into local_today,client_timezone from public.profiles p where p.id=client_id;
  score_input := private.accountability_score_input(client_id);
  select jsonb_build_object(
    'today',local_today,
    'availability',jsonb_build_object('progress',coalesce(privacy.share_progress,false),'nutrition',coalesce(privacy.share_nutrition,false),'accountability',coalesce(privacy.share_accountability,false)),
    'score_input',case when privacy.share_progress and privacy.share_nutrition and privacy.share_accountability then score_input end,
    'client_id', p.id, 'display_name', coalesce(p.display_name,p.first_name,'Client'), 'unit_system', p.unit_system, 'timezone', p.timezone,
    'goal', case when privacy.share_progress then (select jsonb_build_object('goal_type',g.goal_type,'starting_weight',g.starting_weight,'goal_weight',g.goal_weight) from public.user_goals g where g.user_id=client_id and g.is_active limit 1) end,
    'progress', case when privacy.share_progress then jsonb_build_object(
      'latest_weight',(select w.weight_kg from public.weight_entries w where w.user_id=client_id and w.recorded_at<=now() order by w.recorded_at desc limit 1),
      'last_weigh_in',(select w.recorded_at from public.weight_entries w where w.user_id=client_id and w.recorded_at<=now() order by w.recorded_at desc limit 1),
      'change_7d',(select round((newest.weight_kg-oldest.weight_kg)::numeric,2) from (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= (local_today-6)::timestamp at time zone client_timezone and recorded_at <= now() order by recorded_at desc limit 1) newest cross join (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= (local_today-6)::timestamp at time zone client_timezone and recorded_at <= now() order by recorded_at limit 1) oldest),
      'change_30d',(select round((newest.weight_kg-oldest.weight_kg)::numeric,2) from (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= (local_today-29)::timestamp at time zone client_timezone and recorded_at <= now() order by recorded_at desc limit 1) newest cross join (select weight_kg from public.weight_entries where user_id=client_id and recorded_at >= (local_today-29)::timestamp at time zone client_timezone and recorded_at <= now() order by recorded_at limit 1) oldest)
    ) end,
    'nutrition', case when privacy.share_nutrition then (
      select jsonb_build_object(
        'logged_days_7d',count(*) filter(where (d->>'logged')::boolean),
        'protein_days_7d',count(*) filter(where (d->>'proteinTarget')::numeric>0 and (d->>'protein')::numeric >= (d->>'proteinTarget')::numeric*.85),
        'water_days_7d',count(*) filter(where (d->>'waterTarget')::numeric>0 and (d->>'water')::numeric >= (d->>'waterTarget')::numeric*.85)
      ) from jsonb_array_elements(score_input->'days') d
    ) end,
    'accountability', case when privacy.share_accountability then (
      select jsonb_build_object(
        'habit_completion_pct',coalesce(round(100.0*sum((d->>'habitCompleted')::numeric)/nullif(sum((d->>'habitAvailable')::numeric),0),2),0),
        'habit_opportunities',coalesce(sum((d->>'habitAvailable')::integer),0),
        'check_in_days_7d',count(*) filter(where (d->>'checkedIn')::boolean),
        'last_check_in',(select max(ci.check_in_date) from public.daily_check_ins ci where ci.user_id=client_id and ci.check_in_date<=local_today)
      ) from jsonb_array_elements(score_input->'days') d
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
