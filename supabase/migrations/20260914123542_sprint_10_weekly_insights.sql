-- Owner-only weekly snapshots. No source notes, medication or photos are selected.
create table public.weekly_insights (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 period_start date not null, period_end date not null, timezone text not null,
 status text not null default 'pending' check(status in ('pending','completed','failed')),
 model text check(length(model)<=100), prompt_version text not null check(prompt_version='tfk-weekly-v1'),
 input_snapshot jsonb not null check(jsonb_typeof(input_snapshot)='object' and octet_length(input_snapshot::text)<=20000),
 insight_json jsonb check(insight_json is null or (jsonb_typeof(insight_json)='object' and octet_length(insight_json::text)<=12000)),
 generated_text text check(length(generated_text)<=700),
 error_code text check(error_code in ('provider_failed','invalid_output','not_configured','timeout','storage_failed')),
 generated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 attempts integer not null default 1 check(attempts between 1 and 3),
 retry_after timestamptz,
 check(period_end=period_start+6),
 check((status='completed')=(insight_json is not null and generated_at is not null)),
 unique(user_id,period_start,period_end,prompt_version)
);
create index weekly_insights_owner_recent_idx on public.weekly_insights(user_id,period_end desc);
alter table public.weekly_insights enable row level security;
revoke all on public.weekly_insights from public,anon,authenticated;
grant select on public.weekly_insights to authenticated;
create policy weekly_insights_owner_read on public.weekly_insights for select to authenticated
 using(user_id=(select auth.uid()));
-- There is deliberately no coach/admin relationship read policy and no client write grant.

-- Same effective-subscription precedence as get_current_entitlements, for trusted
-- worker operations without a user JWT. No client may call this arbitrary-user helper.
create function private.weekly_insight_features(target uuid) returns text[]
language sql stable security definer set search_path='' as $$
 with subscription as (
  select plan_id from public.user_subscriptions where user_id=target
   and status in ('active','trialing') and (current_period_end is null or current_period_end>now())
   and (status<>'trialing' or trial_ends_at is null or trial_ends_at>now())
  order by created_at desc limit 1
 ), effective as (
  select coalesce((select p.id from public.plans p join subscription s on s.plan_id=p.id where p.is_active),
   (select id from public.plans where code='free' and is_active limit 1)) id
 )
 select coalesce(array_agg(f.code),'{}'::text[]) from effective e
 join public.plan_entitlements pe on pe.plan_id=e.id and pe.enabled join public.features f on f.id=pe.feature_id;
$$;
revoke all on function private.weekly_insight_features(uuid) from public,anon,authenticated;

create function private.weekly_insight_source(target uuid,as_of timestamptz default now()) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; g public.user_goals; d date; start_at timestamptz; score jsonb; features text[];
begin
 select * into strict p from public.profiles where id=target;
 features:=private.weekly_insight_features(target);
 if not ('ai_insights'=any(features)) then raise exception 'Insight access required' using errcode='42501'; end if;
 select * into g from public.user_goals where user_id=target and is_active;
 d:=(as_of at time zone p.timezone)::date;
 start_at:=(d-6)::timestamp at time zone p.timezone;
 score:=private.accountability_score_input(target,as_of);
 return jsonb_build_object(
  'period',jsonb_build_object('start',d-6,'end',d,'timezone',p.timezone,'as_of',as_of,'includes_today',true),
  'unit_system',p.unit_system,'goal_type',g.goal_type,'features',to_jsonb(features),
  'score_input',score,
  'starting_weight',g.starting_weight,
  'latest_weight',(select weight_kg from public.weight_entries where user_id=target and recorded_at<=as_of order by recorded_at desc,id desc limit 1),
  'first_period_weight',(select weight_kg from public.weight_entries where user_id=target and recorded_at>=start_at and recorded_at<=as_of order by recorded_at,id limit 1),
  'weigh_ins',(select count(*) from public.weight_entries where user_id=target and recorded_at>=start_at and recorded_at<=as_of),
  'water_logged_days',(select count(distinct (logged_at at time zone p.timezone)::date) from public.water_logs where user_id=target and logged_at>=start_at and logged_at<=as_of),
  'weekly_check_ins',(select count(*) from public.weekly_check_ins where user_id=target
    and week_start in (select distinct date_trunc('week',(d-i)::timestamp)::date from generate_series(0,6) i) and created_at<=as_of),
  'training',jsonb_build_object(
    'assigned',(select count(*) from public.workout_assignments where client_user_id=target and assigned_for between d-6 and d and status<>'archived'),
    'assigned_completed',(select count(*) from public.workout_assignments where client_user_id=target and assigned_for between d-6 and d and status='completed' and completed_at<=as_of),
    'completed',(select count(*) from public.workout_sessions where user_id=target and status='completed' and completed_at>=start_at and completed_at<=as_of),
    'completed_days',(select count(distinct (completed_at at time zone p.timezone)::date) from public.workout_sessions where user_id=target and status='completed' and completed_at>=start_at and completed_at<=as_of)),
  'coaching_available',exists(select 1 from public.coach_client_relationships where client_user_id=target and status='active'),
  'coaching',jsonb_build_object(
    'active_goals',(select count(*) from public.coach_goals cg join public.coach_client_relationships r on r.id=cg.relationship_id where cg.client_user_id=target and cg.client_visible and r.status='active' and cg.status='active'),
    'completed_goals',(select count(*) from public.coach_goals cg join public.coach_client_relationships r on r.id=cg.relationship_id where cg.client_user_id=target and cg.client_visible and r.status='active' and cg.status='completed' and cg.completed_at>=start_at and cg.completed_at<=as_of))
 );
end; $$;
revoke all on function private.weekly_insight_source(uuid,timestamptz) from public,anon,authenticated;
create function public.get_weekly_insight_source() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return private.weekly_insight_source(auth.uid());
end; $$;
revoke all on function public.get_weekly_insight_source() from public,anon;
grant execute on function public.get_weekly_insight_source() to authenticated;

-- Claim and completion are worker-only. Otherwise clients could forge an AI
-- response/snapshot using a public mutation RPC. Server authenticates the owner
-- before using its isolated service client; the worker never accepts browser IDs.
create function public.claim_weekly_insight(p_user_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare row public.weekly_insights; d date; tz text;
begin
 if not ('ai_insights'=any(private.weekly_insight_features(p_user_id))) then raise exception 'Insight access required' using errcode='42501'; end if;
 select timezone,(now() at time zone timezone)::date into strict tz,d from public.profiles where id=p_user_id;
 if (p_input->'period'->>'start') is distinct from (d-6)::text
  or (p_input->'period'->>'end') is distinct from d::text
  or (p_input->'period'->>'timezone') is distinct from tz then raise exception 'Invalid period' using errcode='22023'; end if;
 -- Per-user transactional lock also prevents timezone changes from bypassing
 -- the cross-period 24-hour cost limit.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,10));
 select * into row from public.weekly_insights where user_id=p_user_id and period_start=d-6 and period_end=d and prompt_version='tfk-weekly-v1' for update;
 if found then
  if row.status='completed' then return jsonb_build_object('claimed',false,'id',row.id,'status','completed'); end if;
  if row.attempts>=3 or row.retry_after>now() then return jsonb_build_object('claimed',false,'id',row.id,'status',row.status); end if;
  -- An expired pending attempt can be retried after its lease. Each attempt
  -- number is a fencing token; late provider responses cannot overwrite retries.
  update public.weekly_insights set status='pending',attempts=attempts+1,retry_after=now()+interval '5 minutes',
   input_snapshot=p_input,error_code=null,updated_at=now() where id=row.id returning * into row;
 else
  if exists(select 1 from public.weekly_insights where user_id=p_user_id and created_at>now()-interval '24 hours') then
   raise exception 'Generation available once per 24 hours' using errcode='54000';
  end if;
  insert into public.weekly_insights(user_id,period_start,period_end,timezone,prompt_version,input_snapshot,retry_after)
  values(p_user_id,d-6,d,tz,'tfk-weekly-v1',p_input,now()+interval '5 minutes') returning * into row;
 end if;
 return jsonb_build_object('claimed',true,'id',row.id,'attempt',row.attempts,'status',row.status);
end; $$;
revoke all on function public.claim_weekly_insight(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_weekly_insight(uuid,jsonb) to service_role;

create function public.finish_weekly_insight(p_id uuid,p_user_id uuid,p_attempt integer,p_result jsonb,p_model text,p_error text default null) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_error is null and p_result is null then raise exception 'Result required' using errcode='22023'; end if;
 if p_error is not null and p_result is not null then raise exception 'Failure cannot include result' using errcode='22023'; end if;
 update public.weekly_insights set status=case when p_error is null then 'completed' else 'failed' end,
  insight_json=p_result,generated_text=case when p_error is null then p_result->>'summary' end,model=p_model,error_code=p_error,
  generated_at=case when p_error is null then now() end,
  retry_after=case when p_error is not null then now()+interval '5 minutes' end,updated_at=now()
 where id=p_id and user_id=p_user_id and status='pending' and attempts=p_attempt;
 return found;
end; $$;
revoke all on function public.finish_weekly_insight(uuid,uuid,integer,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.finish_weekly_insight(uuid,uuid,integer,jsonb,text,text) to service_role;
