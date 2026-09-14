-- Sprint 12 P1/P2 fixes. No scheduler activation or Sprint 10 dependency.
-- Replace functions only; preserve applied migration history and existing data/grants.

create or replace function private.evaluate_due_reminders(target uuid,at_time timestamptz)
returns table(type text,title text,message text,action_url text,dedupe_key text)
language plpgsql stable security definer set search_path='' as $$
declare p public.reminder_preferences;tz text;d date;t time;local_week date;day_start timestamptz;f text[];habit_count integer;habit_name text;
begin
 if at_time is null or not isfinite(at_time) then raise exception 'Finite evaluation time required' using errcode='22023'; end if;
 select * into p from public.reminder_preferences where user_id=target;
 if not found then return; end if;
 select timezone into tz from public.profiles where id=target;
 if tz is null then return; end if;
 d:=(at_time at time zone tz)::date;t:=(at_time at time zone tz)::time;local_week:=date_trunc('week',d::timestamp)::date;day_start:=d::timestamp at time zone tz;
 if p.quiet_hours_enabled and (case when p.quiet_hours_start<p.quiet_hours_end then t>=p.quiet_hours_start and t<p.quiet_hours_end else t>=p.quiet_hours_start or t<p.quiet_hours_end end) then return; end if;
 f:=private.reminder_features(target,at_time);
 if p.daily_check_in_enabled and 'daily_check_ins'=any(f) and t>=p.daily_check_in_time and not exists(select 1 from public.daily_check_ins where user_id=target and check_in_date=d) then
  return query select 'daily_check_in_reminder','Daily check-in','Take a moment to reflect on your day.','/check-ins','daily-check-in:'||d;
 end if;
 if p.weekly_check_in_enabled and 'weekly_check_ins'=any(f) and (d>local_week+((p.weekly_check_in_day+6)%7) or (d=local_week+((p.weekly_check_in_day+6)%7) and t>=p.weekly_check_in_time)) and not exists(select 1 from public.weekly_check_ins where user_id=target and public.weekly_check_ins.week_start=local_week) then
  return query select 'weekly_check_in_reminder','Weekly check-in','Your weekly reflection is ready when you are.','/check-ins','weekly-check-in:'||local_week;
 end if;
 if p.weigh_in_enabled and 'progress_tracking'=any(f) and extract(dow from d)::smallint=any(p.weigh_in_days_of_week) and t>=p.weigh_in_time and not exists(select 1 from public.weight_entries where user_id=target and recorded_at>=day_start and recorded_at<=at_time) then
  return query select 'weigh_in_reminder','Weigh-in reminder','You can record a weigh-in today if you would like.','/progress','weigh-in:'||d;
 end if;
 if p.habit_reminders_enabled and 'habits'=any(f) and t>=p.habit_reminder_time then
  with completions as (
   select c.habit_id,count(*) completed,bool_or(c.completed_on=d) today
   from public.habit_completions c join public.habits h on h.id=c.habit_id and h.user_id=target
   where c.user_id=target and c.completed_on between greatest(local_week,(h.created_at at time zone tz)::date) and d group by c.habit_id
  )
  select count(*)::integer,min(h.name) into habit_count,habit_name from public.habits h left join completions c on c.habit_id=h.id
  where h.user_id=target and h.is_active and h.created_at<=at_time and not coalesce(c.today,false)
   and (h.frequency='daily' or coalesce(c.completed,0)<ceil(least(7,h.target_per_period)*(7-(greatest(local_week,(h.created_at at time zone tz)::date)-local_week))/7.0));
  if habit_count>0 then return query select 'habit_reminder','Habit reminder',case when habit_count=1 then 'A habit to revisit today: '||habit_name||'.' else 'You have '||habit_count||' habits left today.' end,'/check-ins','habits:'||d; end if;
 end if;
 if p.workout_reminders_enabled and 'workouts'=any(f) then
  return query select 'workout_reminder','Workout reminder','A scheduled workout is ready when you are.','/training','workout:'||a.id
   from public.workout_assignments a
   cross join lateral (select coalesce(a.due_at,(a.assigned_for+p.workout_reminder_time) at time zone tz) due) timing
   where a.client_user_id=target and a.status='assigned' and a.created_at<=at_time
    and (a.coach_user_id is null or exists(select 1 from public.coach_client_relationships r where r.id=a.relationship_id and r.client_user_id=target and r.coach_user_id=a.coach_user_id and r.status='active'))
    and ((a.due_at>=day_start and a.due_at<=at_time+make_interval(mins=>p.workout_reminder_minutes_before)) or (a.due_at is null and a.assigned_for between d and ((at_time+make_interval(mins=>p.workout_reminder_minutes_before)) at time zone tz)::date))
    and timing.due is not null and timing.due>=day_start and timing.due<=at_time+make_interval(mins=>p.workout_reminder_minutes_before)
   -- Remove historical candidates before the bound, using the owner/dedupe unique index.
   and not exists(select 1 from public.notifications n where n.user_id=target and n.dedupe_key='workout:'||a.id)
   order by timing.due,a.id limit 20;
 end if;
 if p.glp1_journal_enabled and 'glp1_journal'=any(f) and t>=p.glp1_journal_time then
  return query select 'glp1_journal_reminder','GLP-1 journal','Remember to update your GLP-1 journal.','/glp1','glp1-journal:'||d;
 end if;
end; $$;

create or replace function private.generate_user_reminders(target uuid,at_time timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare operational_time timestamptz; evaluation_time timestamptz; due record;used integer;inserted integer:=0;duplicates integer:=0;capped integer:=0;n integer;
begin
 -- A fixed transaction snapshot cannot safely see a preceding lock holder's inserts.
 if current_setting('transaction_isolation') not in ('read committed','read uncommitted') then
  raise exception 'Reminder generation requires READ COMMITTED' using errcode='25001';
 end if;
 perform 1 from public.reminder_preferences where user_id=target for update;
 if not found then return jsonb_build_object('inserted',0,'duplicates',0,'capped',0); end if;
 -- Refresh only after the row lock. Logical test time never controls quota or storage.
 operational_time:=clock_timestamp();
 evaluation_time:=coalesce(at_time,operational_time);
 if not isfinite(evaluation_time) then raise exception 'Finite evaluation time required' using errcode='22023'; end if;
 -- No upper bound: newer/future committed rows must fail closed, even after clock rollback.
 select count(*)::integer into used from public.notifications where user_id=target and created_at>operational_time-interval '24 hours';
 for due in select * from private.evaluate_due_reminders(target,evaluation_time) loop
  if exists(select 1 from public.notifications where user_id=target and dedupe_key=due.dedupe_key) then duplicates:=duplicates+1;continue;end if;
  if used>=20 then capped:=capped+1;continue;end if;
  insert into public.notifications(user_id,type,title,message,action_url,dedupe_key,created_at,expires_at)
   values(target,due.type,due.title,due.message,due.action_url,due.dedupe_key,operational_time,operational_time+interval '48 hours') on conflict(user_id,dedupe_key) do nothing;
  get diagnostics n=row_count;inserted:=inserted+n;used:=used+n;
 end loop;
 return jsonb_build_object('inserted',inserted,'duplicates',duplicates,'capped',capped);
end; $$;

create or replace function public.generate_due_notifications() returns jsonb
language plpgsql security definer set search_path='' as $$
declare cursor_id uuid;u record;r jsonb;at_time timestamptz;evaluated integer:=0;inserted integer:=0;duplicates integer:=0;errors integer:=0;last_id uuid;
begin
 if not pg_try_advisory_xact_lock(1200120012) then return jsonb_build_object('busy',true);end if;
 at_time:=clock_timestamp();
 select cursor_user_id into cursor_id from private.reminder_scheduler_state where singleton;
 for u in select user_id from public.reminder_preferences order by (cursor_id is not null and user_id<=cursor_id),user_id limit 100 loop
  evaluated:=evaluated+1;last_id:=u.user_id;
  begin
   r:=private.generate_user_reminders(u.user_id,null);inserted:=inserted+(r->>'inserted')::integer;duplicates:=duplicates+(r->>'duplicates')::integer;
  exception when others then errors:=errors+1;
  end;
 end loop;
 update private.reminder_scheduler_state set cursor_user_id=last_id where singleton;
 insert into private.reminder_runs(run_at,users_evaluated,notifications_inserted,duplicates,errors) values(at_time,evaluated,inserted,duplicates,errors);
 delete from private.reminder_runs where id not in (select id from private.reminder_runs order by id desc limit 100);
 return jsonb_build_object('run_at',at_time,'users_evaluated',evaluated,'notifications_inserted',inserted,'duplicates',duplicates,'errors',errors);
end; $$;
revoke all on function private.reminder_features(uuid,timestamptz),private.evaluate_due_reminders(uuid,timestamptz),private.generate_user_reminders(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.generate_due_notifications() from public,anon,authenticated;
grant execute on function public.generate_due_notifications() to service_role;
