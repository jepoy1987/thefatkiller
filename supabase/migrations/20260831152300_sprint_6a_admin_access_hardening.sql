create index user_subscriptions_plan_idx on public.user_subscriptions (plan_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  );
$$;

revoke all on function private.current_user_is_admin() from public, anon, authenticated;
grant execute on function private.current_user_is_admin() to authenticated;

grant insert (user_id, plan_id, status, provider) on public.user_subscriptions to authenticated;
grant update (status, current_period_end) on public.user_subscriptions to authenticated;

create policy "user_subscriptions_select_admin" on public.user_subscriptions for select to authenticated
using ((select private.current_user_is_admin()));
create policy "user_subscriptions_insert_admin" on public.user_subscriptions for insert to authenticated
with check ((select private.current_user_is_admin()));
create policy "user_subscriptions_update_admin" on public.user_subscriptions for update to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create or replace function public.admin_assign_internal_plan(target_user_id uuid, target_plan_code text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_plan_id uuid;
  created_subscription_id uuid;
begin
  if auth.uid() is null or not private.current_user_is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  select p.id into selected_plan_id from public.plans p
  where p.code = target_plan_code and p.is_active;
  if selected_plan_id is null then raise exception 'Active plan not found' using errcode = '22023'; end if;

  update public.user_subscriptions
  set status = 'expired', current_period_end = coalesce(current_period_end, now())
  where user_id = target_user_id and status in ('active', 'trialing', 'past_due', 'incomplete');

  insert into public.user_subscriptions (user_id, plan_id, status, provider)
  values (target_user_id, selected_plan_id, 'active', 'internal')
  returning id into created_subscription_id;
  return created_subscription_id;
end;
$$;
