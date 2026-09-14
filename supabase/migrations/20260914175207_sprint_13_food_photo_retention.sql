-- Additive retention worker primitives. Does not enable any scheduler or store secrets.
alter table public.food_photo_analyses add column cleanup_claim uuid, add column cleanup_lease_until timestamptz;
create index food_photo_retention_queue_idx on public.food_photo_analyses(expires_at,cleanup_lease_until) where status <> 'expired' or storage_path is not null;
create function public.claim_food_photo_cleanup(p_limit integer default 20)
returns setof public.food_photo_analyses language plpgsql security definer set search_path='' as $$
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid batch size' using errcode='22023';end if;
 return query with candidates as (
 select id from public.food_photo_analyses
 where expires_at<=clock_timestamp() and (status<>'expired' or storage_path is not null)
 and (cleanup_lease_until is null or cleanup_lease_until<=clock_timestamp())
 order by coalesce(cleanup_lease_until,expires_at),id limit p_limit for update skip locked
 ) update public.food_photo_analyses a set cleanup_claim=gen_random_uuid(),cleanup_lease_until=clock_timestamp()+interval '5 minutes'
 from candidates c where a.id=c.id returning a.*;
end;$$;
create function public.complete_food_photo_cleanup(p_id uuid,p_user_id uuid,p_claim uuid,p_path text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.food_photo_analyses set status='expired',storage_path=null,result_json=null,error_code=null,provider=null,model=null,cleanup_claim=null,cleanup_lease_until=null
 where id=p_id and user_id=p_user_id and cleanup_claim=p_claim and expires_at<=clock_timestamp()
 and storage_path is not distinct from p_path
 and (p_path is null or p_path=user_id::text||'/'||id::text||'-'||attempts::text||'.jpg');
 return found;
end;$$;
revoke all on function public.claim_food_photo_cleanup(integer),public.complete_food_photo_cleanup(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_food_photo_cleanup(integer),public.complete_food_photo_cleanup(uuid,uuid,uuid,text) to service_role;
