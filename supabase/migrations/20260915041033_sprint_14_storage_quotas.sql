-- Conservative byte budgets via slots reserved at the bucket's 10 MiB maximum:
-- 50 progress objects (500 MiB), 10 temporary food objects (100 MiB).
create table private.storage_reservations (
 user_id uuid not null references auth.users on delete cascade,
 bucket_id text not null check(bucket_id in ('progress-photos','food-analysis')),
 path text not null, expires_at timestamptz not null,
 primary key(bucket_id,path),check(split_part(path,'/',1)=user_id::text)
);
alter table private.storage_reservations enable row level security;
revoke all on private.storage_reservations from public,anon,authenticated;
create function private.reserve_storage(p_user uuid,p_bucket text,p_path text) returns boolean
language plpgsql security definer set search_path='' as $$
declare cap integer; occupied integer; operational_time timestamptz;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Quota unavailable' using errcode='40001'; end if;
 if p_user is null or p_bucket not in ('progress-photos','food-analysis') or p_path is null or p_path !~ ('^'||p_user::text||'/[0-9a-f-]+\.(jpg|jpeg|png|webp)$') then raise exception 'Invalid upload path' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('account:'||p_user::text,0));
 if not exists(select 1 from auth.users where id=p_user) or exists(select 1 from private.account_deletions where user_id=p_user) then raise exception 'Account unavailable' using errcode='42501'; end if;
 operational_time:=clock_timestamp();
 delete from private.storage_reservations where user_id=p_user and expires_at<operational_time;
 if exists(select 1 from storage.objects where bucket_id=p_bucket and name=p_path) then raise exception 'Object already exists' using errcode='22023'; end if;
 if exists(select 1 from private.storage_reservations where bucket_id=p_bucket and path=p_path) then return true; end if;
 cap:=case when p_bucket='progress-photos' then 50 else 10 end;
 select count(*) into occupied from (
  select name from storage.objects where bucket_id=p_bucket and split_part(name,'/',1)=p_user::text
  union select path from private.storage_reservations where user_id=p_user and bucket_id=p_bucket
 ) objects;
 if occupied>=cap then raise exception 'Storage allowance reached; remove a photo before uploading' using errcode='54000'; end if;
 insert into private.storage_reservations values(p_user,p_bucket,p_path,operational_time+interval '10 minutes');return true;
end; $$;
revoke all on function private.reserve_storage(uuid,text,text) from public,anon,authenticated;
create function public.reserve_progress_upload(p_path text) returns boolean
language sql security definer set search_path='' as $$ select private.reserve_storage(auth.uid(),'progress-photos',p_path); $$;
create function public.reserve_food_upload(p_user_id uuid,p_path text) returns boolean
language sql security definer set search_path='' as $$ select private.reserve_storage(p_user_id,'food-analysis',p_path); $$;
create function public.has_progress_reservation(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.storage_reservations where user_id=auth.uid() and bucket_id='progress-photos' and path=p_path and expires_at>clock_timestamp());
$$;
revoke all on function public.reserve_progress_upload(text),public.reserve_food_upload(uuid,text),public.has_progress_reservation(text) from public,anon,authenticated;
grant execute on function public.reserve_progress_upload(text),public.has_progress_reservation(text) to authenticated;
grant execute on function public.reserve_food_upload(uuid,text) to service_role;
create policy progress_storage_quota on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'progress-photos' or public.has_progress_reservation(name));
-- No destructive cleanup of existing objects. Queue grace exceeds reservation TTL.
alter table private.account_deletions alter column ready_at set default clock_timestamp()+interval '15 minutes';
