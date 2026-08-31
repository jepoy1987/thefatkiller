do $$
begin
  if to_regclass('public.user_goals') is null then raise exception 'user_goals is missing'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.user_goals'::regclass) then raise exception 'RLS is disabled'; end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'user_goals') <> 3 then raise exception 'Expected three user_goals policies'; end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'user_goals_one_active_per_user_idx') then raise exception 'Active goal index is missing'; end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.user_goals'::regclass and tgname = 'user_goals_set_updated_at' and not tgisinternal) then raise exception 'updated_at trigger is missing'; end if;
  if to_regprocedure('public.complete_onboarding(text,text,text,date,public.unit_system,public.goal_type,numeric,numeric,numeric,public.activity_level,integer,numeric,numeric,numeric,integer,integer)') is null then raise exception 'complete_onboarding RPC is missing'; end if;
  if to_regprocedure('public.update_goal_settings(public.unit_system,public.goal_type,numeric,public.activity_level,integer,numeric,numeric,numeric,integer,integer)') is null then raise exception 'update_goal_settings RPC is missing'; end if;
end;
$$;

select 'Sprint 2 schema verified' as result;
