-- On-demand reports only. Independent of paused Sprint 10; no source table or policy changes.
create function private.report_context(p_client_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target uuid; features text[]; p public.profiles;
 privacy public.coaching_privacy_settings; rid uuid; coach boolean:=p_client_id is not null;
begin
 if uid is null or not public.has_current_feature('advanced_reports') then
  raise exception 'Report access required' using errcode='42501';
 end if;
 select feature_codes into features from public.get_current_entitlements();
 target:=coalesce(p_client_id,uid);
 if coach then
  -- Reports intentionally have no administrator relationship override.
  if public.get_current_app_role() is distinct from 'coach' or not public.has_current_feature('coach_access') then
   raise exception 'Active coaching relationship required' using errcode='42501';
  end if;
  select id into rid from public.coach_client_relationships
   where coach_user_id=uid and client_user_id=target and status='active';
  if rid is null then raise exception 'Active coaching relationship required' using errcode='42501'; end if;
  select * into privacy from public.coaching_privacy_settings where user_id=target;
 end if;
 select * into strict p from public.profiles where id=target;
 return jsonb_build_object('timezone',p.timezone,'unit_system',p.unit_system,
  'today',(now() at time zone p.timezone)::date,'coach_view',coach,
  'progress',case when coach then coalesce(privacy.share_progress,false) else 'progress_tracking'=any(features) end,
  'nutrition',case when coach then coalesce(privacy.share_nutrition,false) else 'nutrition_tracking'=any(features) end,
  'hydration',case when coach then coalesce(privacy.share_nutrition,false) else 'water_tracking'=any(features) end,
  'accountability',case when coach then coalesce(privacy.share_accountability,false) else 'habits'=any(features) and 'daily_check_ins'=any(features) and 'weekly_check_ins'=any(features) end,
  'score', 'tfk_score'=any(features), 'training','workouts'=any(features));
end; $$;
revoke all on function private.report_context(uuid) from public,anon,authenticated;

create function public.get_report_context(p_client_id uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$ select private.report_context(p_client_id); $$;
revoke all on function public.get_report_context(uuid) from public,anon;
grant execute on function public.get_report_context(uuid) to authenticated;

-- Caller is the guarded public RPC. Aggregate each source once at a daily grain;
-- at most 365 daily rows leave SQL. No notes, photos, medical data or identifiers.
create function private.report_period_data(target uuid, start_date date, end_date date, context jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare tz text:=context->>'timezone'; from_at timestamptz; until_at timestamptz;
 as_of timestamptz; coach boolean:=(context->>'coach_view')::boolean; rid uuid;
 progress_ok boolean:=(context->>'progress')::boolean; nutrition_ok boolean:=(context->>'nutrition')::boolean;
 water_ok boolean:=(context->>'hydration')::boolean; habits_ok boolean:=(context->>'accountability')::boolean;
 training_ok boolean:=(context->>'training')::boolean; result jsonb; g public.user_goals;
begin
 from_at:=start_date::timestamp at time zone tz;
 until_at:=(end_date+1)::timestamp at time zone tz;
 as_of:=least(now(),until_at-interval '1 microsecond');
 select * into g from public.user_goals where user_id=target and is_active;
 if coach then select id into rid from public.coach_client_relationships where coach_user_id=auth.uid() and client_user_id=target and status='active'; end if;
 with dates as (select start_date+i date from generate_series(0,end_date-start_date) i),
 food as (
  select (logged_at at time zone tz)::date date, sum(calories) calories,sum(protein_g) protein,sum(carbs_g) carbs,sum(fat_g) fat
  from public.food_logs where nutrition_ok and user_id=target and logged_at>=from_at and logged_at<until_at and logged_at<=as_of group by 1
 ), water as (
  select (logged_at at time zone tz)::date date,sum(amount_ml) amount
  from public.water_logs where water_ok and user_id=target and logged_at>=from_at and logged_at<until_at and logged_at<=as_of group by 1
 ), weights as (
  select (recorded_at at time zone tz)::date date,count(*) count,
   (array_agg(weight_kg order by recorded_at,id))[1] first,
   (array_agg(weight_kg order by recorded_at desc,id desc))[1] last
  from public.weight_entries where progress_ok and user_id=target and recorded_at>=from_at and recorded_at<until_at and recorded_at<=as_of group by 1
 ), habit_days as (
  select d.date,count(h.id) available,count(hc.id) completed from dates d
  left join public.habits h on habits_ok and h.user_id=target and h.is_active and h.frequency='daily' and (h.created_at at time zone tz)::date<=d.date
  left join public.habit_completions hc on hc.habit_id=h.id and hc.user_id=target and hc.completed_on=d.date group by 1
 ), checked as (
  select check_in_date date from public.daily_check_ins where habits_ok and user_id=target and check_in_date between start_date and end_date
 ), assignments as (
  select assigned_for date,count(*) assigned,count(*) filter(where status='completed' and completed_at<=as_of) completed
  from public.workout_assignments where training_ok and client_user_id=target and assigned_for between start_date and end_date and status<>'archived'
   and (not coach or (coach_user_id=auth.uid() and relationship_id=rid)) group by 1
 ), sessions as (
  select (s.started_at at time zone tz)::date date,count(*) total
  from public.workout_sessions s where training_ok and s.user_id=target and s.started_at>=from_at and s.started_at<until_at and s.started_at<=as_of
   and (not coach or exists(select 1 from public.workout_assignments a where a.id=s.assignment_id and a.coach_user_id=auth.uid() and a.relationship_id=rid)) group by 1
 ), finished as (
  select (s.completed_at at time zone tz)::date date,count(*) completed
  from public.workout_sessions s where training_ok and s.user_id=target and s.status='completed' and s.completed_at>=from_at and s.completed_at<until_at and s.completed_at<=as_of
   and (not coach or exists(select 1 from public.workout_assignments a where a.id=s.assignment_id and a.coach_user_id=auth.uid() and a.relationship_id=rid)) group by 1
 )
 select jsonb_build_object('start',start_date,'end',end_date,'days',jsonb_agg(jsonb_build_object(
  'date',d.date,'weight',case when progress_ok then jsonb_build_object('count',coalesce(wt.count,0),'first',wt.first,'last',wt.last) end,
  'nutrition',case when nutrition_ok then jsonb_build_object('calories',f.calories,'protein',f.protein,'carbs',f.carbs,'fat',f.fat) end,
  'water',case when water_ok then w.amount end,
  'accountability',case when habits_ok then jsonb_build_object('available',h.available,'completed',h.completed,'checked',ci.date is not null) end,
  'training',case when training_ok then jsonb_build_object('assigned',coalesce(a.assigned,0),'assigned_completed',coalesce(a.completed,0),'sessions',coalesce(s.total,0),'completed',coalesce(c.completed,0)) end
 ) order by d.date)) into result from dates d left join food f using(date) left join water w using(date) left join weights wt using(date)
 left join habit_days h using(date) left join checked ci using(date) left join assignments a using(date) left join sessions s using(date) left join finished c using(date);
 return result || jsonb_build_object(
  'targets',jsonb_build_object('calories',case when nutrition_ok then g.daily_calorie_target end,'protein',case when nutrition_ok then g.daily_protein_target end,'water',case when water_ok then g.daily_water_target end),
  'weekly_check_ins',case when habits_ok then (select count(*) from public.weekly_check_ins where user_id=target and created_at<=now() and week_start in (select distinct date_trunc('week',(start_date+i)::timestamp)::date from generate_series(0,end_date-start_date) i)) end,
  'score_input',case when progress_ok and nutrition_ok and water_ok and habits_ok and (context->>'score')::boolean then private.accountability_score_input(target,as_of) end);
end; $$;
revoke all on function private.report_period_data(uuid,date,date,jsonb) from public,anon,authenticated;

create function public.get_report_data(p_start date,p_end date,p_client_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare context jsonb; target uuid:=coalesce(p_client_id,auth.uid()); days integer;
begin
 context:=private.report_context(p_client_id);
 days:=p_end-p_start+1;
 if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end)
  or p_start<date '1900-01-01' or days<1 or days>365 or p_end>(context->>'today')::date then
  raise exception 'Use a valid range of up to 365 local days ending no later than today' using errcode='22023';
 end if;
 return jsonb_build_object('context',context,'current',private.report_period_data(target,p_start,p_end,context),
  'previous',case when days in (7,30) then private.report_period_data(target,p_start-days,p_start-1,context) end);
end; $$;
revoke all on function public.get_report_data(date,date,uuid) from public,anon;
grant execute on function public.get_report_data(date,date,uuid) to authenticated;
