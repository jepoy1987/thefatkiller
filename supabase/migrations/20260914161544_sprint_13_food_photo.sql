-- Additive, independent of paused Sprint 10. No scheduler activation.
insert into public.features(code,name,description) values('ai_food_photo','Food photo logging','Review approximate photo nutrition before saving.');
insert into public.plan_entitlements(plan_id,feature_id,enabled,limits)
select p.id,f.id,p.code in ('premium','coach'),'{}'::jsonb from public.plans p cross join public.features f where f.code='ai_food_photo';
create table public.food_photo_analyses (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','completed','failed','confirmed','expired')),
 storage_path text, provider text, model text, prompt_version text not null default 'food-photo-v1',
 result_json jsonb, error_code text check(error_code in ('provider_failed','invalid_output','timeout','upload_failed','cleanup_failed')),
 attempts integer not null default 1 check(attempts between 1 and 3),
 created_at timestamptz not null default clock_timestamp(), started_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz, expires_at timestamptz not null default clock_timestamp()+interval '24 hours',
 confirmed_log_ids uuid[],
 check(storage_path is null or storage_path=user_id::text||'/'||id::text||'-'||attempts::text||'.jpg')
);
create index food_photo_owner_created_idx on public.food_photo_analyses(user_id,created_at desc);
create index food_photo_cleanup_idx on public.food_photo_analyses(expires_at) where status<>'expired';
alter table public.food_photo_analyses enable row level security;
revoke all on public.food_photo_analyses from public,anon,authenticated;
grant select on public.food_photo_analyses to authenticated;
create policy food_photo_owner on public.food_photo_analyses for select to authenticated using(user_id=(select auth.uid()) and expires_at>now());

-- Both structured provider data and edited snapshots have strict bounded numeric inputs.
create function private.valid_food_photo_items(items jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; k text;
begin
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 20 then return false;end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'name') is distinct from 'string' or length(trim(item->>'name')) not between 1 and 120 then return false;end if;
  if jsonb_typeof(item->'estimated_portion') is distinct from 'object' or jsonb_typeof(item#>'{estimated_portion,amount}') is distinct from 'number' or (item#>>'{estimated_portion,amount}')::numeric not between 0.01 and 10000 or jsonb_typeof(item#>'{estimated_portion,unit}') is distinct from 'string' or item#>>'{estimated_portion,unit}' not in ('g','ml','oz','cup','tbsp','tsp','piece','serving','other') then return false;end if;
  foreach k in array array['estimated_calories','protein_g','carbs_g','fat_g'] loop
   if jsonb_typeof(item->k) is distinct from 'number' or (item->>k)::numeric not between 0 and 10000 then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;$$;

create function public.claim_food_photo(p_id uuid,p_user_id uuid,p_retry boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.food_photo_analyses; t timestamptz; used integer;
begin
 if current_setting('transaction_isolation') not in ('read committed','read uncommitted') then raise exception 'Fresh snapshot required' using errcode='25001';end if;
 perform 1 from public.profiles where id=p_user_id for update;
 if not found then raise exception 'Owner unavailable' using errcode='42501';end if;
 t:=clock_timestamp();
 if not ('ai_food_photo'=any(private.reminder_features(p_user_id,t))) then raise exception 'Feature unavailable' using errcode='42501';end if;
 select * into a from public.food_photo_analyses where id=p_id for update;
 if found then
  if a.user_id<>p_user_id then raise exception 'Analysis unavailable' using errcode='42501';end if;
  if a.expires_at<=t then raise exception 'Analysis expired' using errcode='22023';end if;
  if not p_retry or a.status in ('completed','confirmed') or (a.status='pending' and a.started_at>t-interval '2 minutes') then return jsonb_build_object('claimed',false,'analysis',to_jsonb(a));end if;
  if a.attempts>=3 or a.storage_path is not null then raise exception 'Retry unavailable' using errcode='54000';end if;
 end if;
 select coalesce(sum(attempts),0) into used from public.food_photo_analyses where user_id=p_user_id and started_at>t-interval '24 hours';
 if used>=10 then raise exception 'Daily analysis limit reached' using errcode='54000';end if;
 if a.id is null then
  insert into public.food_photo_analyses(id,user_id,storage_path,created_at,started_at,expires_at)
  values(p_id,p_user_id,p_user_id::text||'/'||p_id::text||'-1.jpg',t,t,t+interval '24 hours') returning * into a;
 else
  update public.food_photo_analyses set status='pending',attempts=attempts+1,storage_path=p_user_id::text||'/'||p_id::text||'-'||(attempts+1)::text||'.jpg',started_at=t,error_code=null where id=p_id returning * into a;
 end if;
 return jsonb_build_object('claimed',true,'analysis',to_jsonb(a));
end;$$;

create function public.finish_food_photo(p_id uuid,p_user_id uuid,p_attempt integer,p_result jsonb,p_provider text,p_model text,p_error text,p_deleted boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 p_error:=nullif(p_error,'');
 if p_result is not null and (not private.valid_food_photo_items(p_result->'items') or jsonb_typeof(p_result->'uncertainties') is distinct from 'array' or pg_column_size(p_result)>30000) then raise exception 'Invalid result' using errcode='22023';end if;
 if length(p_provider)>40 or length(p_model)>120 then raise exception 'Invalid provider' using errcode='22023';end if;
 update public.food_photo_analyses set status=case when p_error is null and p_result is not null then 'completed' else 'failed' end,
 result_json=p_result,provider=p_provider,model=p_model,error_code=p_error,completed_at=clock_timestamp(),storage_path=case when p_deleted then null else storage_path end
 where id=p_id and user_id=p_user_id and attempts=p_attempt and status='pending' and expires_at>clock_timestamp();
 return found;
end;$$;

create function public.confirm_food_photo(p_id uuid,p_items jsonb,p_meal_type public.meal_type,p_logged_at timestamptz,p_notes text default '')
returns uuid[] language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.food_photo_analyses;item jsonb;ids uuid[]:=array[]::uuid[];log_id uuid;
begin
 if u is null or not ('ai_food_photo'=any(private.reminder_features(u,clock_timestamp()))) then raise exception 'Feature unavailable' using errcode='42501';end if;
 select * into a from public.food_photo_analyses where id=p_id and user_id=u for update;
 if not found then raise exception 'Analysis unavailable' using errcode='42501';end if;
 if a.status='confirmed' then return a.confirmed_log_ids;end if;
 if a.status<>'completed' or a.expires_at<=clock_timestamp() then raise exception 'Analysis not ready' using errcode='22023';end if;
 if not coalesce(private.valid_food_photo_items(p_items),false) or p_meal_type is null or p_logged_at is null or not isfinite(p_logged_at) or p_logged_at>clock_timestamp()+interval '5 minutes' or p_logged_at<clock_timestamp()-interval '365 days' or length(p_notes)>500 then raise exception 'Invalid review' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  insert into public.food_logs(user_id,food_id,meal_type,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,logged_at,notes)
  values(u,null,p_meal_type,trim(item->>'name'),1,(item#>>'{estimated_portion,amount}')::numeric,item#>>'{estimated_portion,unit}',(item->>'estimated_calories')::numeric,(item->>'protein_g')::numeric,(item->>'carbs_g')::numeric,(item->>'fat_g')::numeric,p_logged_at,nullif(p_notes,'')) returning id into log_id;
  ids:=array_append(ids,log_id);
 end loop;
 update public.food_photo_analyses set status='confirmed',confirmed_log_ids=ids where id=p_id;
 return ids;
end;$$;

-- Storage removal must use the Storage API, never delete storage.objects metadata directly.
create function public.clear_food_photo_storage(p_id uuid,p_user_id uuid,p_path text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.food_photo_analyses set storage_path=null where id=p_id and user_id=p_user_id and storage_path=p_path;
 return found;
end;$$;
create function public.expire_food_photo(p_id uuid,p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.food_photo_analyses set status='expired',result_json=null,error_code=null,provider=null,model=null where id=p_id and user_id=p_user_id and expires_at<=clock_timestamp() and storage_path is null;
 return found;
end;$$;
revoke all on function private.valid_food_photo_items(jsonb) from public,anon,authenticated;
revoke all on function public.claim_food_photo(uuid,uuid,boolean),public.finish_food_photo(uuid,uuid,integer,jsonb,text,text,text,boolean),public.clear_food_photo_storage(uuid,uuid,text),public.expire_food_photo(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_food_photo(uuid,uuid,boolean),public.finish_food_photo(uuid,uuid,integer,jsonb,text,text,text,boolean),public.clear_food_photo_storage(uuid,uuid,text),public.expire_food_photo(uuid,uuid) to service_role;
revoke all on function public.confirm_food_photo(uuid,jsonb,public.meal_type,timestamptz,text) from public,anon;
grant execute on function public.confirm_food_photo(uuid,jsonb,public.meal_type,timestamptz,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('food-analysis','food-analysis',false,3145728,array['image/jpeg','image/png','image/webp']);
-- Only the trusted upload handler writes validated, re-encoded images. Owner read access
-- additionally requires an unexpired analysis and an exact server-generated path.
create policy food_analysis_owner_read on storage.objects for select to authenticated using(
 bucket_id='food-analysis' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.food_photo_analyses a where a.user_id=auth.uid() and a.storage_path=name and a.expires_at>now())
);
