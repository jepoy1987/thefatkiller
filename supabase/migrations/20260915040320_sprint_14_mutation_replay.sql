-- Seven-day replay window. Timestamp is part of the key: an expired key is
-- rejected even after its record is pruned, never silently executed again.
create table private.mutation_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null, operation text not null, input_hash text not null,
 result jsonb not null, expires_at timestamptz not null,
 primary key(user_id,request_key)
);
alter table private.mutation_receipts enable row level security;
revoke all on private.mutation_receipts from public,anon,authenticated;
create index mutation_receipts_expiry on private.mutation_receipts(expires_at);
create function public.replay_safe_mutation(p_key text,p_operation text,p_input jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); issued timestamptz; operational_time timestamptz;
 receipt private.mutation_receipts; result jsonb; new_id uuid; f public.food_logs;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Retry safely' using errcode='40001'; end if;
 if p_key is null or p_key !~ '^[0-9]{13}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>20000 then
  raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('mutation:'||actor::text,0));
 operational_time:=clock_timestamp(); issued:=to_timestamp(split_part(p_key,':',1)::numeric/1000);
 if issued<operational_time-interval '7 days' or issued>operational_time+interval '5 minutes' then
  raise exception 'Request expired; reload before submitting a new entry' using errcode='22023'; end if;
 delete from private.mutation_receipts where user_id=actor and expires_at<operational_time;
 select * into receipt from private.mutation_receipts where user_id=actor and request_key=p_key;
 if found then
  if receipt.operation<>p_operation or receipt.input_hash<>md5(p_input::text) then
   raise exception 'Request key already used for a different entry' using errcode='22023'; end if;
  return receipt.result;
 end if;
 -- Hard storage bound per account, including clients deliberately minting keys.
 if (select count(*) from private.mutation_receipts where user_id=actor)>=2000 then
  raise exception 'Mutation budget reached' using errcode='54000'; end if;
 if p_operation='food_log' then
  if p_input - array['food_id','meal_type','food_name_snapshot','brand_snapshot','servings','serving_size_snapshot','serving_unit_snapshot','calories','protein_g','carbs_g','fat_g','fiber_g','logged_at','notes'] <> '{}'::jsonb then
   raise exception 'Invalid fields' using errcode='22023'; end if;
  f:=jsonb_populate_record(null::public.food_logs,p_input);
  if f.food_id is not null and not exists(select 1 from public.foods where id=f.food_id and (owner_user_id=actor or owner_user_id is null)) then
   raise exception 'Food access denied' using errcode='42501'; end if;
  insert into public.food_logs(user_id,food_id,meal_type,food_name_snapshot,brand_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,fiber_g,logged_at,notes)
  values(actor,f.food_id,f.meal_type,f.food_name_snapshot,f.brand_snapshot,f.servings,f.serving_size_snapshot,f.serving_unit_snapshot,f.calories,f.protein_g,f.carbs_g,f.fat_g,f.fiber_g,f.logged_at,f.notes) returning id into new_id;
  result:=jsonb_build_object('id',new_id);
 elsif p_operation='water_log' then
  if p_input-array['amount_ml','logged_at']<>'{}'::jsonb then raise exception 'Invalid fields' using errcode='22023'; end if;
  insert into public.water_logs(user_id,amount_ml,logged_at) values(actor,(p_input->>'amount_ml')::numeric,(p_input->>'logged_at')::timestamptz) returning id into new_id;
  result:=jsonb_build_object('id',new_id);
 elsif p_operation='saved_meal' then
  if p_input-array['id','meal_type','logged_at']<>'{}'::jsonb then raise exception 'Invalid fields' using errcode='22023'; end if;
  select jsonb_build_object('ids',coalesce(jsonb_agg(l.id),'[]'::jsonb)) into result from public.log_saved_meal((p_input->>'id')::uuid,(p_input->>'meal_type')::public.meal_type,(p_input->>'logged_at')::timestamptz) l;
 elsif p_operation in ('training_start','training_complete') then
  result:=public.training_mutate(case when p_operation='training_start' then 'start' else 'complete' end,p_input);
 else raise exception 'Unsupported mutation' using errcode='22023'; end if;
 insert into private.mutation_receipts values(actor,p_key,p_operation,md5(p_input::text),result,issued+interval '7 days');
 return result;
end; $$;
revoke all on function public.replay_safe_mutation(text,text,jsonb) from public,anon;
grant execute on function public.replay_safe_mutation(text,text,jsonb) to authenticated;
-- Operator/worker maintenance; no persistent scheduler enabled by this migration.
create function public.prune_mutation_receipts(p_limit integer default 500) returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
 with expired as (select user_id,request_key from private.mutation_receipts where expires_at<clock_timestamp() order by expires_at limit least(greatest(p_limit,1),500) for update skip locked)
 delete from private.mutation_receipts r using expired e where r.user_id=e.user_id and r.request_key=e.request_key;
 get diagnostics removed=row_count; return removed;
end; $$;
revoke all on function public.prune_mutation_receipts(integer) from public,anon,authenticated;
grant execute on function public.prune_mutation_receipts(integer) to service_role;
