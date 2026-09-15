-- Durable deletion queue. Only a verified owner can request; trusted worker
-- removes bytes first, then Auth (whose FKs cascade application data).
create table private.account_deletions (
 user_id uuid primary key references auth.users on delete cascade,
 requested_at timestamptz not null default clock_timestamp(),
 ready_at timestamptz not null default clock_timestamp()+interval '5 minutes',
 lease uuid, lease_until timestamptz, attempts integer not null default 0
);
alter table private.account_deletions enable row level security;
revoke all on private.account_deletions from public,anon,authenticated;
create function public.request_account_deletion(p_confirmation text) returns boolean
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users where id=actor) then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_confirmation is distinct from 'DELETE MY ACCOUNT' then raise exception 'Explicit confirmation required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('account:'||actor::text,0));
 insert into private.account_deletions(user_id) values(actor) on conflict do nothing;
 -- Revoke refresh sessions; existing JWTs are blocked from mutations below.
 delete from auth.sessions where user_id=actor;
 return true;
end; $$;
revoke all on function public.request_account_deletion(text) from public,anon;
grant execute on function public.request_account_deletion(text) to authenticated;
create function private.guard_account_mutation() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target text; data jsonb:=to_jsonb(new);
begin
 if actor is not null then
  perform pg_advisory_xact_lock(hashtextextended('account:'||actor::text,0));
  if not exists(select 1 from auth.users where id=actor) or exists(select 1 from private.account_deletions where user_id=actor) then
   raise exception 'Account deletion in progress' using errcode='42501'; end if;
 end if;
 -- Also block trusted AI or another coach writing data for a deleting owner.
 for target in select value from jsonb_each_text(data) where key in ('user_id','owner_user_id','client_user_id','coach_user_id') loop
  if target is not null and exists(select 1 from private.account_deletions where user_id::text=target) then
   raise exception 'Account deletion in progress' using errcode='42501'; end if;
 end loop;
 return new;
end; $$;
revoke all on function private.guard_account_mutation() from public,anon,authenticated;
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('create trigger account_mutation_guard before insert or update on public.%I for each row execute function private.guard_account_mutation()',t.tablename);
 end loop;
end $$;
create function public.account_storage_active() returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended('account:'||actor::text,0));
 return exists(select 1 from auth.users where id=actor) and not exists(select 1 from private.account_deletions where user_id=actor);
end; $$;
revoke all on function public.account_storage_active() from public,anon;
grant execute on function public.account_storage_active() to authenticated;
create policy account_storage_active_insert on storage.objects as restrictive for insert to authenticated with check(public.account_storage_active());
create policy account_storage_active_update on storage.objects as restrictive for update to authenticated using(public.account_storage_active()) with check(public.account_storage_active());
create function public.claim_account_deletions(p_limit integer default 2) returns table(user_id uuid,lease uuid)
language sql security definer set search_path='' as $$
 with candidates as (select d.user_id from private.account_deletions d where ready_at<=clock_timestamp() and (lease_until is null or lease_until<clock_timestamp()) order by requested_at limit least(greatest(p_limit,1),5) for update skip locked)
 update private.account_deletions d set lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1 from candidates c where d.user_id=c.user_id returning d.user_id,d.lease;
$$;
create function public.account_deletion_objects(p_user_id uuid,p_lease uuid) returns table(bucket_id text,name text)
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.account_deletions where user_id=p_user_id and lease=p_lease and lease_until>clock_timestamp()) then raise exception 'Invalid deletion lease' using errcode='42501'; end if;
 return query select o.bucket_id,o.name from storage.objects o where o.bucket_id in ('progress-photos','food-analysis') and split_part(o.name,'/',1)=p_user_id::text order by o.bucket_id,o.name limit 100;
end; $$;
create function public.account_deletion_ready(p_user_id uuid,p_lease uuid) returns boolean
language sql security definer set search_path='' as $$
 select exists(select 1 from private.account_deletions where user_id=p_user_id and lease=p_lease and lease_until>clock_timestamp())
 and not exists(select 1 from storage.objects where split_part(name,'/',1)=p_user_id::text or owner_id=p_user_id::text);
$$;
revoke all on function public.claim_account_deletions(integer),public.account_deletion_objects(uuid,uuid),public.account_deletion_ready(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_account_deletions(integer),public.account_deletion_objects(uuid,uuid),public.account_deletion_ready(uuid,uuid) to service_role;
