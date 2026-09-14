-- In-app only. No scheduler is activated by this migration in any environment.
create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 type text not null check(type in ('weigh_in_reminder','daily_check_in_reminder','weekly_check_in_reminder','habit_reminder','workout_reminder','glp1_journal_reminder','system')),
 title text not null check(length(title) between 1 and 160),
 message text not null check(length(message) between 1 and 500),
 action_url text check(action_url in ('/progress','/check-ins','/training','/glp1','/notifications')),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
 dedupe_key text not null check(length(dedupe_key) between 1 and 200),
 read_at timestamptz, created_at timestamptz not null default now(), expires_at timestamptz,
 unique(user_id,dedupe_key), check(expires_at is null or expires_at>created_at)
);
create index notifications_history_idx on public.notifications(user_id,created_at desc,id);
create index notifications_unread_idx on public.notifications(user_id,read_at,expires_at);
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
create policy notifications_owner_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));

-- No rows are backfilled: saving settings explicitly opts a user into evaluation.
-- Profile timezone is canonical; there is deliberately no timezone override.
create table public.reminder_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 weigh_in_enabled boolean not null default false,
 weigh_in_time time not null default '08:00',
 weigh_in_days_of_week smallint[] not null default '{1,3,5}',
 daily_check_in_enabled boolean not null default true,
 daily_check_in_time time not null default '20:00',
 weekly_check_in_enabled boolean not null default true,
 weekly_check_in_day smallint not null default 0 check(weekly_check_in_day between 0 and 6),
 weekly_check_in_time time not null default '18:00',
 habit_reminders_enabled boolean not null default true,
 habit_reminder_time time not null default '18:00',
 workout_reminders_enabled boolean not null default true,
 workout_reminder_minutes_before integer not null default 60 check(workout_reminder_minutes_before between 0 and 1440),
 workout_reminder_time time not null default '09:00',
 glp1_journal_enabled boolean not null default false,
 glp1_journal_time time not null default '20:00',
 quiet_hours_enabled boolean not null default false,
 quiet_hours_start time not null default '22:00', quiet_hours_end time not null default '07:00',
 updated_at timestamptz not null default now(),
 check(cardinality(weigh_in_days_of_week) between 1 and 7 and weigh_in_days_of_week <@ array[0,1,2,3,4,5,6]::smallint[] and array_position(weigh_in_days_of_week,null) is null),
 check(not quiet_hours_enabled or quiet_hours_start<>quiet_hours_end),
 check(weigh_in_time<'24:00' and daily_check_in_time<'24:00' and weekly_check_in_time<'24:00' and habit_reminder_time<'24:00' and workout_reminder_time<'24:00' and glp1_journal_time<'24:00' and quiet_hours_start<'24:00' and quiet_hours_end<'24:00'),
 check(extract(second from weigh_in_time)=0 and extract(second from daily_check_in_time)=0 and extract(second from weekly_check_in_time)=0 and extract(second from habit_reminder_time)=0 and extract(second from workout_reminder_time)=0 and extract(second from glp1_journal_time)=0 and extract(second from quiet_hours_start)=0 and extract(second from quiet_hours_end)=0)
);
alter table public.reminder_preferences enable row level security;
revoke all on public.reminder_preferences from public,anon,authenticated;
grant select,insert,update on public.reminder_preferences to authenticated;
create policy reminder_preferences_read on public.reminder_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy reminder_preferences_insert on public.reminder_preferences for insert to authenticated with check(user_id=(select auth.uid()));
create policy reminder_preferences_update on public.reminder_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create trigger reminder_preferences_updated before update on public.reminder_preferences for each row execute function public.set_updated_at();

create function public.set_notification_read(p_id uuid,p_read boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if auth.uid() is null or p_read is null then raise exception 'Authentication and read state required' using errcode='42501'; end if;
 update public.notifications set read_at=case when p_read then now() end where id=p_id and user_id=auth.uid();
 get diagnostics changed=row_count;
 return changed=1;
end; $$;
create function public.mark_all_notifications_read() returns integer
language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null;
 get diagnostics changed=row_count;return changed;
end; $$;
-- Bounded lookup: 101 means 100+. Expired rows remain in history, not in the badge.
create function public.notification_unread_count() returns integer
language sql stable security invoker set search_path='' as $$
 select count(*)::integer from (select id from public.notifications where user_id=auth.uid() and read_at is null and (expires_at is null or expires_at>now()) limit 101) n;
$$;
revoke all on function public.set_notification_read(uuid,boolean),public.mark_all_notifications_read(),public.notification_unread_count() from public,anon;
grant execute on function public.set_notification_read(uuid,boolean),public.mark_all_notifications_read(),public.notification_unread_count() to authenticated;

-- Same effective-plan precedence as the existing entitlement resolver, but for a
-- trusted background worker. No dependency on paused Sprint 10 or user JWT spoofing.
create function private.reminder_features(target uuid,at_time timestamptz) returns text[]
language sql stable security definer set search_path='' as $$
 with subscription as (
  select plan_id from public.user_subscriptions where user_id=target and status in ('active','trialing')
   and (current_period_end is null or current_period_end>at_time) and (status<>'trialing' or trial_ends_at is null or trial_ends_at>at_time)
  order by created_at desc limit 1
 ), effective as (
  select coalesce((select p.id from public.plans p join subscription s on s.plan_id=p.id where p.is_active),(select id from public.plans where code='free' and is_active)) id
 ) select coalesce(array_agg(f.code),'{}'::text[]) from effective e join public.plan_entitlements pe on pe.plan_id=e.id and pe.enabled join public.features f on f.id=pe.feature_id;
$$;

create index assignments_reminder_due_idx on public.workout_assignments(client_user_id,due_at) where status='assigned';

-- Pure evaluator: at_time is injectable only through private, privileged SQL.
-- Due rows do not include notes, medical records, or coach-authored content.
create function private.evaluate_due_reminders(target uuid,at_time timestamptz)
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
   order by timing.due,a.id limit 20;
 end if;
 if p.glp1_journal_enabled and 'glp1_journal'=any(f) and t>=p.glp1_journal_time then
  return query select 'glp1_journal_reminder','GLP-1 journal','Remember to update your GLP-1 journal.','/glp1','glp1-journal:'||d;
 end if;
end; $$;

-- Row lock serializes ticks for this user; the unique key is a second safeguard.
-- Rolling 24-hour cap also resists profile-timezone changes and long DST days.
create function private.generate_user_reminders(target uuid,at_time timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare due record;used integer;inserted integer:=0;duplicates integer:=0;capped integer:=0;n integer;
begin
 perform 1 from public.reminder_preferences where user_id=target for update;
 if not found then return jsonb_build_object('inserted',0,'duplicates',0,'capped',0); end if;
 select count(*)::integer into used from public.notifications where user_id=target and created_at>at_time-interval '24 hours' and created_at<=at_time;
 for due in select * from private.evaluate_due_reminders(target,at_time) loop
  if exists(select 1 from public.notifications where user_id=target and dedupe_key=due.dedupe_key) then duplicates:=duplicates+1;continue;end if;
  if used>=20 then capped:=capped+1;continue;end if;
  insert into public.notifications(user_id,type,title,message,action_url,dedupe_key,created_at,expires_at)
   values(target,due.type,due.title,due.message,due.action_url,due.dedupe_key,at_time,at_time+interval '48 hours') on conflict(user_id,dedupe_key) do nothing;
  get diagnostics n=row_count;inserted:=inserted+n;used:=used+n;
 end loop;
 return jsonb_build_object('inserted',inserted,'duplicates',duplicates,'capped',capped);
end; $$;

create table private.reminder_scheduler_state (singleton boolean primary key default true check(singleton),cursor_user_id uuid);
insert into private.reminder_scheduler_state(singleton) values(true);
create table private.reminder_runs (id bigint generated always as identity primary key,run_at timestamptz not null,users_evaluated integer not null,notifications_inserted integer not null,duplicates integer not null,errors integer not null);
alter table private.reminder_scheduler_state enable row level security;
alter table private.reminder_runs enable row level security;
revoke all on private.reminder_scheduler_state,private.reminder_runs from public,anon,authenticated;

-- SQL-native worker. Bounded round-robin batches avoid repeatedly scanning only
-- the first users. Only service_role/DB operator can invoke; never page render.
create function public.generate_due_notifications() returns jsonb
language plpgsql security definer set search_path='' as $$
declare cursor_id uuid;u record;r jsonb;at_time timestamptz:=now();evaluated integer:=0;inserted integer:=0;duplicates integer:=0;errors integer:=0;last_id uuid;
begin
 if not pg_try_advisory_xact_lock(1200120012) then return jsonb_build_object('busy',true);end if;
 select cursor_user_id into cursor_id from private.reminder_scheduler_state where singleton;
 for u in select user_id from public.reminder_preferences order by (cursor_id is not null and user_id<=cursor_id),user_id limit 100 loop
  evaluated:=evaluated+1;last_id:=u.user_id;
  begin
   r:=private.generate_user_reminders(u.user_id,at_time);inserted:=inserted+(r->>'inserted')::integer;duplicates:=duplicates+(r->>'duplicates')::integer;
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
