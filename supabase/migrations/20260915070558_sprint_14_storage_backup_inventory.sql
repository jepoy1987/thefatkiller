-- Read-only, service-role-only inventory used by the independent Storage exporter.
-- No scheduler or destination is configured by this migration.
create function public.storage_backup_candidates(
  p_after_bucket text default '',
  p_after_path text default '',
  p_limit integer default 100
)
returns table(
  bucket_id text,
  object_path text,
  application_owner_id uuid,
  source_table text,
  source_id uuid,
  source_created_at timestamptz,
  food_status text,
  food_expires_at timestamptz,
  storage_id text,
  storage_owner_id text,
  storage_created_at timestamptz,
  storage_updated_at timestamptz,
  storage_metadata jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 100 then
    raise exception 'Backup page limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  select candidate.bucket_id, candidate.object_path, candidate.application_owner_id,
         candidate.source_table, candidate.source_id, candidate.source_created_at,
         candidate.food_status, candidate.food_expires_at,
         candidate.storage_id, candidate.storage_owner_id,
         candidate.storage_created_at, candidate.storage_updated_at,
         candidate.storage_metadata
  from (
    select 'progress-photos'::text as bucket_id,
           p.storage_path as object_path,
           p.user_id as application_owner_id,
           'progress_photos'::text as source_table,
           p.id as source_id,
           p.created_at as source_created_at,
           null::text as food_status,
           null::timestamptz as food_expires_at,
           to_jsonb(o)->>'id' as storage_id,
           coalesce(to_jsonb(o)->>'owner_id', to_jsonb(o)->>'owner') as storage_owner_id,
           (to_jsonb(o)->>'created_at')::timestamptz as storage_created_at,
           (to_jsonb(o)->>'updated_at')::timestamptz as storage_updated_at,
           coalesce(to_jsonb(o)->'metadata', '{}'::jsonb) as storage_metadata
    from public.progress_photos p
    left join storage.objects o
      on o.bucket_id = 'progress-photos' and o.name = p.storage_path
    where split_part(p.storage_path, '/', 1) = p.user_id::text
      and not exists (
        select 1 from private.account_deletions d where d.user_id = p.user_id
      )

    union all

    select 'food-analysis'::text,
           a.storage_path,
           a.user_id,
           'food_photo_analyses'::text,
           a.id,
           a.created_at,
           a.status,
           a.expires_at,
           to_jsonb(o)->>'id',
           coalesce(to_jsonb(o)->>'owner_id', to_jsonb(o)->>'owner'),
           (to_jsonb(o)->>'created_at')::timestamptz,
           (to_jsonb(o)->>'updated_at')::timestamptz,
           coalesce(to_jsonb(o)->'metadata', '{}'::jsonb)
    from public.food_photo_analyses a
    left join storage.objects o
      on o.bucket_id = 'food-analysis' and o.name = a.storage_path
    where a.status in ('pending', 'failed')
      and a.storage_path is not null
      and a.expires_at > clock_timestamp()
      and a.storage_path = a.user_id::text || '/' || a.id::text || '-' || a.attempts::text || '.jpg'
      and not exists (
        select 1 from private.account_deletions d where d.user_id = a.user_id
      )
  ) candidate
  where (candidate.bucket_id, candidate.object_path) > (p_after_bucket, p_after_path)
  order by candidate.bucket_id, candidate.object_path
  limit p_limit;
end;
$$;

create function public.storage_backup_candidate_current(
  p_bucket text,
  p_path text,
  p_source_id uuid,
  p_storage_id text,
  p_storage_updated_at timestamptz
)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select case
    when p_bucket = 'progress-photos' then exists (
      select 1
      from public.progress_photos p
      join storage.objects o on o.bucket_id = p_bucket and o.name = p.storage_path
      where p.id = p_source_id
        and p.storage_path = p_path
        and split_part(p.storage_path, '/', 1) = p.user_id::text
        and to_jsonb(o)->>'id' = p_storage_id
        and (to_jsonb(o)->>'updated_at')::timestamptz is not distinct from p_storage_updated_at
        and not exists (select 1 from private.account_deletions d where d.user_id = p.user_id)
    )
    when p_bucket = 'food-analysis' then exists (
      select 1
      from public.food_photo_analyses a
      join storage.objects o on o.bucket_id = p_bucket and o.name = a.storage_path
      where a.id = p_source_id
        and a.storage_path = p_path
        and a.status in ('pending', 'failed')
        and a.expires_at > clock_timestamp()
        and a.storage_path = a.user_id::text || '/' || a.id::text || '-' || a.attempts::text || '.jpg'
        and to_jsonb(o)->>'id' = p_storage_id
        and (to_jsonb(o)->>'updated_at')::timestamptz is not distinct from p_storage_updated_at
        and not exists (select 1 from private.account_deletions d where d.user_id = a.user_id)
    )
    else false
  end;
$$;

revoke all on function public.storage_backup_candidates(text, text, integer) from public, anon, authenticated;
revoke all on function public.storage_backup_candidate_current(text, text, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.storage_backup_candidates(text, text, integer) to service_role;
grant execute on function public.storage_backup_candidate_current(text, text, uuid, text, timestamptz) to service_role;
