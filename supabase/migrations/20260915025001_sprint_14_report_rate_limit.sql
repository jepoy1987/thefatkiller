-- Durable, bounded per-owner report budget. No scheduler or history changes.
create table private.report_read_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 calls timestamptz[] not null default '{}' check(cardinality(calls)<=30)
);
alter table private.report_read_limits enable row level security;
revoke all on private.report_read_limits from public,anon,authenticated;
create function private.claim_report_read() returns void
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); operational_time timestamptz; recent timestamptz[];
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if current_setting('transaction_isolation') <> 'read committed' then raise exception 'Quota unavailable' using errcode='40001'; end if;
 perform pg_advisory_xact_lock(hashtextextended('report-read:'||actor::text,0));
 -- Refresh AFTER the lock: an older transaction must not reuse its start time.
 operational_time:=clock_timestamp();
 select coalesce(array_agg(t order by t),'{}'::timestamptz[]) into recent
 from private.report_read_limits r cross join lateral unnest(r.calls) t
 where r.user_id=actor and t>operational_time-interval '1 minute';
 if cardinality(recent)>=30 then raise exception 'Report rate limit reached' using errcode='54000'; end if;
 insert into private.report_read_limits(user_id,calls) values(actor,array_append(recent,operational_time))
 on conflict(user_id) do update set calls=excluded.calls;
end; $$;
revoke all on function private.claim_report_read() from public,anon,authenticated;

create or replace function public.get_report_data(p_start date,p_end date,p_client_id uuid default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare context jsonb; target uuid:=coalesce(p_client_id,auth.uid()); days integer;
begin
 context:=private.report_context(p_client_id);
 days:=p_end-p_start+1;
 if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end)
  or p_start<date '1900-01-01' or days<1 or days>365 or p_end>(context->>'today')::date then
  raise exception 'Use a valid range of up to 365 local days ending no later than today' using errcode='22023';
 end if;
 perform private.claim_report_read();
 return jsonb_build_object('context',context,'current',private.report_period_data(target,p_start,p_end,context),
  'previous',case when days in (7,30) then private.report_period_data(target,p_start-days,p_start-1,context) end);
end; $$;
revoke all on function public.get_report_data(date,date,uuid) from public,anon;
grant execute on function public.get_report_data(date,date,uuid) to authenticated;
