create or replace function public.get_current_entitlements()
returns table (
  plan_code text,
  plan_name text,
  subscription_status public.subscription_status,
  provider public.billing_provider,
  feature_codes text[],
  limits jsonb,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  trial_ends_at timestamptz,
  is_internal_test boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  latest_subscription record;
  effective_subscription record;
  effective_plan record;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  select us.id, us.plan_id, us.status, us.provider, us.current_period_start,
    us.current_period_end, us.cancel_at_period_end, us.trial_ends_at
  into latest_subscription
  from public.user_subscriptions us
  where us.user_id = caller_id
  order by us.created_at desc
  limit 1;

  select us.id, us.plan_id, us.status, us.provider, us.current_period_start,
    us.current_period_end, us.cancel_at_period_end, us.trial_ends_at
  into effective_subscription
  from public.user_subscriptions us
  where us.user_id = caller_id
    and us.status in ('active', 'trialing')
    and (us.current_period_end is null or us.current_period_end > now())
    and (us.status <> 'trialing' or us.trial_ends_at is null or us.trial_ends_at > now())
  order by us.created_at desc
  limit 1;

  select p.id, p.code, p.name into effective_plan
  from public.plans p
  where p.id = effective_subscription.plan_id and p.is_active
  limit 1;

  if effective_plan.id is null then
    select p.id, p.code, p.name into effective_plan
    from public.plans p where p.code = 'free' and p.is_active limit 1;
  end if;

  return query
  select effective_plan.code, effective_plan.name,
    coalesce(effective_subscription.status, latest_subscription.status),
    coalesce(effective_subscription.provider, latest_subscription.provider),
    coalesce(array_agg(f.code order by f.code) filter (where pe.enabled), '{}'::text[]),
    coalesce(jsonb_object_agg(f.code, pe.limits) filter (where pe.enabled), '{}'::jsonb),
    effective_subscription.current_period_start,
    effective_subscription.current_period_end,
    coalesce(effective_subscription.cancel_at_period_end, false),
    effective_subscription.trial_ends_at,
    effective_subscription.id is not null and effective_subscription.provider in ('internal', 'manual')
  from public.plan_entitlements pe
  join public.features f on f.id = pe.feature_id
  where pe.plan_id = effective_plan.id and pe.enabled;
end;
$$;
