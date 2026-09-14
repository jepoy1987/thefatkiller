-- Fix only assignment_status authorization; other command branches are unchanged.
create or replace function private.training_mutate(operation text, payload jsonb) returns jsonb
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
  if not found then raise exception 'Assignment access denied' using errcode='42501'; end if;
  -- Status commands never accept assignment identity/ownership changes.
  if (payload - array['id','status']) <> '{}'::jsonb then
   raise exception 'Assignment fields are immutable' using errcode='42501';
  end if;
  -- No admin override: administrators follow the same assigned-client rule.
  -- Explicit branches fail closed even when coach/relationship columns are NULL.
  if a.client_user_id=uid then
   if ((a.status='assigned' and payload->>'status'='skipped') or
           (a.status='skipped' and payload->>'status'='assigned')) is not true then
    raise exception 'Client may only skip or restore an assignment' using errcode='22023';
   end if;
  else
   if a.coach_user_id is distinct from uid or not private.current_user_has_coach_access() then
    raise exception 'Assignment access denied' using errcode='42501';
   end if;
   -- Lock the live relationship through the mutation so a concurrent pause/end
   -- cannot revoke access between this check and the assignment update.
   perform 1 from public.coach_client_relationships
   where id=a.relationship_id and coach_user_id=uid
     and client_user_id=a.client_user_id and status='active' for share;
   if not found then raise exception 'Active coach relationship required' using errcode='42501'; end if;
   if a.status not in ('assigned','skipped') or payload->>'status' is distinct from 'archived' then
    raise exception 'Coach may only archive an assigned or skipped workout' using errcode='22023';
   end if;
  end if;
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

-- Preserve the existing private definer / public invoker boundary and grants.
revoke all on function private.training_mutate(text,jsonb) from public, anon;
grant execute on function private.training_mutate(text,jsonb) to authenticated;
revoke all on function public.training_mutate(text,jsonb) from public, anon;
grant execute on function public.training_mutate(text,jsonb) to authenticated;
