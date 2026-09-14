-- Training is entitlement-gated. Clients read through RLS and mutate only via
-- authenticated commands; coach summaries never grant access to raw client logs.
create table public.exercises (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid references auth.users on delete cascade,
 name text not null check(length(btrim(name)) between 2 and 120), description text check(length(description)<=1000),
 category text not null check(category in ('strength','cardio','mobility','conditioning','core','other')),
 equipment text not null check(equipment in ('none','barbell','dumbbell','kettlebell','machine','cable','band','bodyweight','cardio_machine','other')),
 tracking_type text not null check(tracking_type in ('sets_reps','duration','distance','duration_distance','bodyweight','other')),
 instructions text check(length(instructions)<=2000), is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index exercises_owner_name_idx on public.exercises(owner_user_id,lower(name));
create index exercises_category_equipment_idx on public.exercises(category,equipment) where is_active;
create table public.workout_templates (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users on delete cascade,
 name text not null check(length(btrim(name)) between 2 and 120), description text check(length(description)<=1000),
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index workout_templates_owner_idx on public.workout_templates(owner_user_id,created_at desc);
create table public.workout_template_items (
 id uuid primary key default gen_random_uuid(), workout_template_id uuid not null references public.workout_templates on delete cascade,
 exercise_id uuid not null references public.exercises on delete restrict, position integer not null check(position>=0),
 target_sets integer check(target_sets between 1 and 100), target_reps_min integer check(target_reps_min between 1 and 10000),
 target_reps_max integer check(target_reps_max between 1 and 10000), target_duration_seconds integer check(target_duration_seconds between 1 and 86400),
 target_distance_meters numeric check(target_distance_meters>0 and target_distance_meters<=1000000),
 target_rest_seconds integer check(target_rest_seconds between 0 and 3600), notes text check(length(notes)<=1000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workout_template_id,position), check(target_reps_max>=target_reps_min)
);
create index workout_items_exercise_idx on public.workout_template_items(exercise_id);
create table public.training_programs (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users on delete cascade,
 name text not null check(length(btrim(name)) between 2 and 120), description text check(length(description)<=1000),
 duration_weeks integer check(duration_weeks between 1 and 104), is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index training_programs_owner_idx on public.training_programs(owner_user_id);
create table public.training_program_workouts (
 id uuid primary key default gen_random_uuid(), program_id uuid not null references public.training_programs on delete cascade,
 workout_template_id uuid not null references public.workout_templates on delete restrict,
 week_number integer check(week_number between 1 and 104), day_number integer check(day_number between 1 and 7),
 position integer not null check(position>=0), created_at timestamptz not null default now(), unique(program_id,position)
);
create index program_workouts_template_idx on public.training_program_workouts(workout_template_id);
create table public.workout_assignments (
 id uuid primary key default gen_random_uuid(), coach_user_id uuid references auth.users on delete cascade,
 client_user_id uuid not null references auth.users on delete cascade,
 relationship_id uuid references public.coach_client_relationships on delete cascade,
 workout_template_id uuid not null references public.workout_templates on delete restrict,
 program_id uuid references public.training_programs on delete set null,
 assigned_for date, due_at timestamptz, status text not null default 'assigned' check(status in ('assigned','in_progress','completed','skipped','archived')),
 notes text check(length(notes)<=1000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz,
 check((coach_user_id is null and relationship_id is null) or (coach_user_id is not null and relationship_id is not null)),
 check((status='completed')=(completed_at is not null))
);
create index assignments_client_status_date_idx on public.workout_assignments(client_user_id,status,assigned_for);
create index assignments_coach_idx on public.workout_assignments(coach_user_id);
create index assignments_relationship_idx on public.workout_assignments(relationship_id);
create index assignments_template_idx on public.workout_assignments(workout_template_id);
create index assignments_program_idx on public.workout_assignments(program_id);
create table public.workout_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 workout_template_id uuid references public.workout_templates on delete set null,
 assignment_id uuid references public.workout_assignments on delete set null,
 name_snapshot text not null check(length(name_snapshot) between 2 and 120), started_at timestamptz not null default now(), completed_at timestamptz,
 status text not null default 'in_progress' check(status in ('in_progress','completed','abandoned')),
 notes text check(length(notes)<=2000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((status='completed')=(completed_at is not null)), check(completed_at>=started_at)
);
create index sessions_user_started_idx on public.workout_sessions(user_id,started_at desc);
create index sessions_template_idx on public.workout_sessions(workout_template_id);
create unique index sessions_assignment_once_idx on public.workout_sessions(assignment_id) where status in ('in_progress','completed');
create table public.workout_session_exercises (
 id uuid primary key default gen_random_uuid(), workout_session_id uuid not null references public.workout_sessions on delete cascade,
 exercise_id uuid references public.exercises on delete set null, exercise_name_snapshot text not null,
 tracking_type_snapshot text not null check(tracking_type_snapshot in ('sets_reps','duration','distance','duration_distance','bodyweight','other')),
 position integer not null check(position>=0), targets_snapshot jsonb not null default '{}', notes text check(length(notes)<=1000),
 created_at timestamptz not null default now(), unique(workout_session_id,position)
);
create index session_exercises_exercise_idx on public.workout_session_exercises(exercise_id);
create table public.workout_set_logs (
 id uuid primary key default gen_random_uuid(), workout_session_exercise_id uuid not null references public.workout_session_exercises on delete cascade,
 set_number integer not null check(set_number between 1 and 100), reps numeric check(reps>0 and reps<=10000),
 weight_kg numeric check(weight_kg>0 and weight_kg<=2000), duration_seconds integer check(duration_seconds between 1 and 86400),
 distance_meters numeric check(distance_meters>0 and distance_meters<=1000000), rpe numeric check(rpe between 1 and 10),
 completed boolean not null default true, notes text check(length(notes)<=1000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workout_session_exercise_id,set_number),
 check(reps is not null or duration_seconds is not null or distance_meters is not null)
);

create function private.training_entitled() returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.get_current_entitlements() e where 'workouts'=any(e.feature_codes));
$$;
create function private.training_relationship(client_id uuid) returns uuid language sql stable security definer set search_path='' as $$
 select r.id from public.coach_client_relationships r
 where auth.uid() is not null and private.current_user_has_coach_access() and r.coach_user_id=auth.uid() and r.client_user_id=client_id and r.status='active' limit 1;
$$;
create function private.training_template_read(template_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.workout_templates t where t.id=template_id and
 (t.owner_user_id=auth.uid() or exists(select 1 from public.workout_assignments a where a.workout_template_id=t.id and a.client_user_id=auth.uid()
 and (a.coach_user_id is null or exists(select 1 from public.coach_client_relationships r where r.id=a.relationship_id and r.status='active' and r.client_user_id=auth.uid() and r.coach_user_id=a.coach_user_id)))));
$$;

do $$ declare t text; begin
 foreach t in array array['exercises','workout_templates','workout_template_items','training_programs','training_program_workouts','workout_assignments','workout_sessions','workout_session_exercises','workout_set_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy exercises_read on public.exercises for select to authenticated using ((owner_user_id is null and is_active) or owner_user_id=auth.uid());
create policy templates_read on public.workout_templates for select to authenticated using ((select private.training_entitled()) and private.training_template_read(id));
create policy template_items_read on public.workout_template_items for select to authenticated using ((select private.training_entitled()) and private.training_template_read(workout_template_id));
create policy programs_read on public.training_programs for select to authenticated using ((select private.training_entitled()) and owner_user_id=auth.uid());
create policy program_workouts_read on public.training_program_workouts for select to authenticated using (exists(select 1 from public.training_programs p where p.id=program_id and p.owner_user_id=auth.uid()));
create policy assignments_read on public.workout_assignments for select to authenticated using ((select private.training_entitled()) and (client_user_id=auth.uid() or (coach_user_id=auth.uid() and relationship_id=private.training_relationship(client_user_id))));
create policy sessions_read on public.workout_sessions for select to authenticated using ((select private.training_entitled()) and user_id=auth.uid());
create policy session_exercises_read on public.workout_session_exercises for select to authenticated using (exists(select 1 from public.workout_sessions s where s.id=workout_session_id and s.user_id=auth.uid()));
create policy set_logs_read on public.workout_set_logs for select to authenticated using (exists(select 1 from public.workout_session_exercises e join public.workout_sessions s on s.id=e.workout_session_id where e.id=workout_session_exercise_id and s.user_id=auth.uid()));

-- A single private transactional command boundary validates ownership and all
-- cross-table relationships. The public wrapper has no elevated privileges.
create function private.training_mutate(operation text, payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); rid uuid; tid uuid; sid uuid; eid uuid; result_id uuid;
 item jsonb; pos integer:=0; t public.workout_templates; a public.workout_assignments;
 s public.workout_sessions; e public.workout_session_exercises; client_id uuid; current_tracking text;
begin
 if uid is null or not private.training_entitled() then raise exception 'Workout access required' using errcode='42501'; end if;
 if payload ?| array['user_id','owner_user_id','coach_user_id','relationship_id','completed_at','started_at'] then
  raise exception 'Identity and timestamps are server controlled' using errcode='42501';
 end if;
 result_id:=nullif(payload->>'id','')::uuid;
 if operation='save_exercise' then
  if result_id is null then
   insert into public.exercises(owner_user_id,name,description,category,equipment,tracking_type,instructions)
   values(uid,btrim(payload->>'name'),nullif(payload->>'description',''),payload->>'category',payload->>'equipment',payload->>'tracking_type',nullif(payload->>'instructions','')) returning id into result_id;
  else
   update public.exercises set name=btrim(payload->>'name'),description=nullif(payload->>'description',''),category=payload->>'category',equipment=payload->>'equipment',tracking_type=payload->>'tracking_type',instructions=nullif(payload->>'instructions',''),updated_at=now()
   where id=result_id and owner_user_id=uid;
   if not found then raise exception 'Exercise not owned' using errcode='42501'; end if;
  end if;
 elsif operation='delete_exercise' then
  delete from public.exercises where id=result_id and owner_user_id=uid;
  if not found then raise exception 'Exercise not owned' using errcode='42501'; end if;
 elsif operation='save_template' then
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 30 then raise exception 'Choose 1 to 30 exercises' using errcode='22023'; end if;
  if result_id is null then
   insert into public.workout_templates(owner_user_id,name,description) values(uid,btrim(payload->>'name'),nullif(payload->>'description','')) returning id into result_id;
  else
   select * into t from public.workout_templates where id=result_id and owner_user_id=uid for update;
   if not found then raise exception 'Workout not owned' using errcode='42501'; end if;
   update public.workout_templates set name=btrim(payload->>'name'),description=nullif(payload->>'description',''),updated_at=now() where id=result_id;
   delete from public.workout_template_items where workout_template_id=result_id;
  end if;
  for item in select value from jsonb_array_elements(payload->'items') loop
   eid:=(item->>'exercise_id')::uuid;
   if not exists(select 1 from public.exercises where id=eid and is_active and (owner_user_id is null or owner_user_id=uid)) then raise exception 'Exercise not available' using errcode='42501'; end if;
   insert into public.workout_template_items(workout_template_id,exercise_id,position,target_sets,target_reps_min,target_reps_max,target_duration_seconds,target_distance_meters,target_rest_seconds,notes)
   values(result_id,eid,pos,(item->>'target_sets')::integer,(item->>'target_reps_min')::integer,(item->>'target_reps_max')::integer,(item->>'target_duration_seconds')::integer,(item->>'target_distance_meters')::numeric,(item->>'target_rest_seconds')::integer,nullif(item->>'notes',''));
   pos:=pos+1;
  end loop;
 elsif operation in ('archive_template','delete_template') then
  select * into t from public.workout_templates where id=result_id and owner_user_id=uid for update;
  if not found then raise exception 'Workout not owned' using errcode='42501'; end if;
  if operation='archive_template' then update public.workout_templates set is_active=false,updated_at=now() where id=result_id;
  else delete from public.workout_templates where id=result_id; end if;
 elsif operation='save_program' then
  if jsonb_typeof(payload->'workouts') is distinct from 'array' or jsonb_array_length(payload->'workouts') not between 1 and 60 then raise exception 'Choose 1 to 60 workouts' using errcode='22023'; end if;
  if result_id is null then
   insert into public.training_programs(owner_user_id,name,description,duration_weeks) values(uid,btrim(payload->>'name'),nullif(payload->>'description',''),(payload->>'duration_weeks')::integer) returning id into result_id;
  else
   perform 1 from public.training_programs where id=result_id and owner_user_id=uid for update;
   if not found then raise exception 'Program not owned' using errcode='42501'; end if;
   update public.training_programs set name=btrim(payload->>'name'),description=nullif(payload->>'description',''),duration_weeks=(payload->>'duration_weeks')::integer,updated_at=now() where id=result_id;
   delete from public.training_program_workouts where program_id=result_id;
  end if;
  for item in select value from jsonb_array_elements(payload->'workouts') loop
   tid:=(item->>'workout_template_id')::uuid;
   if not exists(select 1 from public.workout_templates where id=tid and owner_user_id=uid and is_active) then raise exception 'Workout not owned' using errcode='42501'; end if;
   insert into public.training_program_workouts(program_id,workout_template_id,position,week_number,day_number) values(result_id,tid,pos,(item->>'week_number')::integer,(item->>'day_number')::integer);
   pos:=pos+1;
  end loop;
 elsif operation='delete_program' then
  delete from public.training_programs where id=result_id and owner_user_id=uid;
  if not found then raise exception 'Program not owned' using errcode='42501'; end if;
 elsif operation='assign' then
  tid:=(payload->>'workout_template_id')::uuid;client_id:=coalesce(nullif(payload->>'client_id','')::uuid,uid);
  select * into t from public.workout_templates where id=tid and owner_user_id=uid and is_active for share;
  if not found then raise exception 'Workout not owned' using errcode='42501'; end if;
  if client_id<>uid then
   rid:=private.training_relationship(client_id);
   if rid is null then raise exception 'Active coach relationship required' using errcode='42501'; end if;
   perform 1 from public.coach_client_relationships where id=rid and status='active' for share;
   if not found then raise exception 'Active coach relationship required' using errcode='42501'; end if;
  end if;
  insert into public.workout_assignments(coach_user_id,client_user_id,relationship_id,workout_template_id,assigned_for,due_at,notes)
  values(case when client_id<>uid then uid end,client_id,rid,tid,(payload->>'assigned_for')::date,(payload->>'due_at')::timestamptz,nullif(payload->>'notes','')) returning id into result_id;
 elsif operation='assignment_status' then
  select * into a from public.workout_assignments where id=result_id for update;
  if not found or not (a.client_user_id=uid or (a.coach_user_id=uid and a.relationship_id=private.training_relationship(a.client_user_id))) then raise exception 'Assignment access denied' using errcode='42501'; end if;
  if payload->>'status' not in ('assigned','skipped','archived') or payload->>'status' is null then raise exception 'Complete assignments through a workout session' using errcode='22023'; end if;
  if a.status in ('in_progress','completed') then raise exception 'Active or completed assignment cannot be changed' using errcode='22023'; end if;
  update public.workout_assignments set status=payload->>'status',updated_at=now() where id=result_id;
 elsif operation='start' then
  if nullif(payload->>'assignment_id','') is not null then
   select * into a from public.workout_assignments where id=(payload->>'assignment_id')::uuid and client_user_id=uid for update;
   if not found then raise exception 'Assignment access denied' using errcode='42501'; end if;
   if a.coach_user_id is not null then
    perform 1 from public.coach_client_relationships where id=a.relationship_id and client_user_id=uid and coach_user_id=a.coach_user_id and status='active' for share;
    if not found then raise exception 'Active coaching relationship required' using errcode='42501'; end if;
   end if;
   if a.status not in ('assigned','in_progress') then raise exception 'Assignment cannot be started' using errcode='22023'; end if;
   select id into sid from public.workout_sessions where assignment_id=a.id and status='in_progress';
   if found then return jsonb_build_object('id',sid); end if;
   tid:=a.workout_template_id;
  else tid:=(payload->>'workout_template_id')::uuid; end if;
  select * into t from public.workout_templates where id=tid and is_active and (owner_user_id=uid or a.id is not null) for share;
  if not found then raise exception 'Workout access denied' using errcode='42501'; end if;
  if not exists(select 1 from public.workout_template_items where workout_template_id=tid) then raise exception 'Workout has no exercises' using errcode='22023'; end if;
  insert into public.workout_sessions(user_id,workout_template_id,assignment_id,name_snapshot) values(uid,tid,a.id,t.name) returning id into result_id;
  insert into public.workout_session_exercises(workout_session_id,exercise_id,exercise_name_snapshot,tracking_type_snapshot,position,targets_snapshot,notes)
  select result_id,ex.id,ex.name,ex.tracking_type,i.position,jsonb_build_object('sets',i.target_sets,'reps_min',i.target_reps_min,'reps_max',i.target_reps_max,'duration_seconds',i.target_duration_seconds,'distance_meters',i.target_distance_meters,'rest_seconds',i.target_rest_seconds),i.notes
  from public.workout_template_items i join public.exercises ex on ex.id=i.exercise_id where i.workout_template_id=tid order by i.position;
  if a.id is not null then update public.workout_assignments set status='in_progress',updated_at=now() where id=a.id; end if;
 elsif operation in ('save_set','delete_set') then
  select * into e from public.workout_session_exercises where id=(payload->>'session_exercise_id')::uuid;
  if not found then raise exception 'Session access denied' using errcode='42501'; end if;
  select * into s from public.workout_sessions where id=e.workout_session_id and user_id=uid for update;
  if not found then raise exception 'Session access denied' using errcode='42501'; end if;
  if s.status<>'in_progress' then raise exception 'Session is read only' using errcode='22023'; end if;
  current_tracking:=e.tracking_type_snapshot;
  if operation='delete_set' then
   delete from public.workout_set_logs where workout_session_exercise_id=e.id and set_number=(payload->>'set_number')::integer;
  else
   if (current_tracking in ('sets_reps','bodyweight') and payload->>'reps' is null)
    or (current_tracking in ('duration','duration_distance') and payload->>'duration_seconds' is null)
    or (current_tracking in ('distance','duration_distance') and payload->>'distance_meters' is null) then raise exception 'Required tracking fields missing' using errcode='22023'; end if;
   if (current_tracking='bodyweight' and payload->>'weight_kg' is not null)
    or (current_tracking in ('sets_reps','bodyweight') and (payload->>'duration_seconds' is not null or payload->>'distance_meters' is not null))
    or (current_tracking in ('duration','distance','duration_distance') and (payload->>'weight_kg' is not null or payload->>'reps' is not null))
    or (current_tracking='duration' and payload->>'distance_meters' is not null)
    or (current_tracking='distance' and payload->>'duration_seconds' is not null) then raise exception 'Tracking fields do not match exercise' using errcode='22023'; end if;
   insert into public.workout_set_logs(workout_session_exercise_id,set_number,reps,weight_kg,duration_seconds,distance_meters,rpe,completed,notes)
   values(e.id,(payload->>'set_number')::integer,(payload->>'reps')::numeric,(payload->>'weight_kg')::numeric,(payload->>'duration_seconds')::integer,(payload->>'distance_meters')::numeric,(payload->>'rpe')::numeric,coalesce((payload->>'completed')::boolean,true),nullif(payload->>'notes',''))
   on conflict(workout_session_exercise_id,set_number) do update set reps=excluded.reps,weight_kg=excluded.weight_kg,duration_seconds=excluded.duration_seconds,distance_meters=excluded.distance_meters,rpe=excluded.rpe,completed=excluded.completed,notes=excluded.notes,updated_at=now() returning id into result_id;
  end if;
 elsif operation in ('complete','abandon','session_notes','delete_session') then
  select * into s from public.workout_sessions where id=result_id and user_id=uid for update;
  if not found then raise exception 'Session access denied' using errcode='42501'; end if;
  if operation='delete_session' then
   if s.assignment_id is not null then raise exception 'Assigned session history is retained' using errcode='22023'; end if;
   delete from public.workout_sessions where id=s.id;
  elsif operation='complete' and s.status='completed' then return jsonb_build_object('id',s.id);
  else
   if s.status<>'in_progress' then raise exception 'Session is read only' using errcode='22023'; end if;
   if operation='complete' then
    if not exists(select 1 from public.workout_set_logs l join public.workout_session_exercises x on x.id=l.workout_session_exercise_id where x.workout_session_id=s.id and l.completed) then raise exception 'Log a completed set before completing' using errcode='22023'; end if;
    update public.workout_sessions set status='completed',completed_at=now(),updated_at=now() where id=s.id;
    update public.workout_assignments set status='completed',completed_at=now(),updated_at=now() where id=s.assignment_id and client_user_id=uid;
   elsif operation='abandon' then
    update public.workout_sessions set status='abandoned',updated_at=now() where id=s.id;
    update public.workout_assignments set status='assigned',updated_at=now() where id=s.assignment_id and status='in_progress';
   else update public.workout_sessions set notes=nullif(payload->>'notes',''),updated_at=now() where id=s.id;
   end if;
  end if;
 else raise exception 'Unknown training command' using errcode='22023';
 end if;
 return jsonb_build_object('id',result_id);
end;
$$;
create function public.training_mutate(operation text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.training_mutate(operation,payload); $$;

create function private.training_summary(target_user_id uuid, coach_view boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d date; tz text; rid uuid; result jsonb;
begin
 if auth.uid() is null or not private.training_entitled() then raise exception 'Workout access required' using errcode='42501'; end if;
 if coach_view then
  rid:=private.training_relationship(target_user_id);
  if rid is null then raise exception 'Active coach relationship required' using errcode='42501'; end if;
 elsif target_user_id<>auth.uid() then raise exception 'Summary access denied' using errcode='42501'; end if;
 select timezone into tz from public.profiles where id=target_user_id;
 d:=(now() at time zone coalesce(tz,'UTC'))::date;
 select jsonb_build_object('today',d,
 'completed_7d',count(*) filter(where (completed_at at time zone coalesce(tz,'UTC'))::date between d-6 and d),
 'completed_30d',count(*) filter(where (completed_at at time zone coalesce(tz,'UTC'))::date between d-29 and d),
 'last_completed_at',max(completed_at)) into result
 from public.workout_sessions where user_id=target_user_id and status='completed'
 and (not coach_view or exists(select 1 from public.workout_assignments a where a.id=assignment_id and a.relationship_id=rid and a.coach_user_id=auth.uid()));
 return result || (select jsonb_build_object('assigned_7d',count(*),'assigned_completed_7d',count(*) filter(where status='completed'))
 from public.workout_assignments where client_user_id=target_user_id and status<>'archived' and assigned_for between d-6 and d
 and (not coach_view or (relationship_id=rid and coach_user_id=auth.uid())));
end $$;
create function public.get_training_summary() returns jsonb language sql security invoker set search_path='' as $$ select private.training_summary(auth.uid(),false); $$;
create function public.get_coach_client_training_summary(client_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.training_summary(client_id,true); $$;

do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
 (n.nspname='private' and p.proname in ('training_entitled','training_relationship','training_template_read','training_mutate','training_summary'))
 or (n.nspname='public' and p.proname in ('training_mutate','get_training_summary','get_coach_client_training_summary')) loop
 execute format('revoke all on function %s from public, anon, authenticated',f);
 execute format('grant execute on function %s to authenticated',f);
 end loop;
end $$;
insert into public.exercises(name,category,equipment,tracking_type,instructions) values
 ('Goblet squat','strength','dumbbell','sets_reps','Use a comfortable range of motion and controlled repetitions.'),
 ('Dumbbell row','strength','dumbbell','sets_reps','Support your stance and move with control.'),
 ('Bench press','strength','barbell','sets_reps','Use an appropriate load and assistance when needed.'),
 ('Push-up','strength','bodyweight','bodyweight','Choose a variation appropriate to your ability.'),
 ('Bodyweight squat','strength','bodyweight','bodyweight','Move at a comfortable pace.'),
 ('Plank','core','bodyweight','duration','Record the duration of your hold.'),
 ('Walking','cardio','none','duration_distance','Record your elapsed time and distance.'),
 ('Cycling','cardio','cardio_machine','duration_distance','Record your elapsed time and distance.'),
 ('Mobility flow','mobility','none','duration','Record time spent on your usual mobility routine.'),
 ('Distance walk','cardio','none','distance','Record the distance you completed.');
