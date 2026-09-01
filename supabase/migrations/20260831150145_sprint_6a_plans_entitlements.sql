create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'expired', 'incomplete');
create type public.billing_provider as enum ('internal', 'stripe', 'apple', 'google', 'manual');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);

create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  enabled boolean not null default true,
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  created_at timestamptz not null default now(),
  unique (plan_id, feature_id)
);

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null,
  provider public.billing_provider not null,
  provider_customer_id text check (char_length(provider_customer_id) <= 255),
  provider_subscription_id text check (char_length(provider_subscription_id) <= 255),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end is null or current_period_start is null or current_period_end >= current_period_start),
  check (provider <> 'internal' or (provider_customer_id is null and provider_subscription_id is null))
);

-- Historical rows are retained, while only one non-terminal billing state may be current.
create unique index user_subscriptions_one_current_idx on public.user_subscriptions (user_id)
where status in ('active', 'trialing', 'past_due', 'incomplete');
create index user_subscriptions_user_created_idx on public.user_subscriptions (user_id, created_at desc);
create index plan_entitlements_plan_idx on public.plan_entitlements (plan_id) where enabled;
create index plan_entitlements_feature_idx on public.plan_entitlements (feature_id);

create trigger plans_set_updated_at before update on public.plans
for each row execute function public.set_updated_at();
create trigger user_subscriptions_set_updated_at before update on public.user_subscriptions
for each row execute function public.set_updated_at();

alter table public.plans enable row level security;
alter table public.features enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.user_subscriptions enable row level security;

revoke all on public.plans, public.features, public.plan_entitlements, public.user_subscriptions from anon, authenticated;
grant select on public.plans, public.features, public.plan_entitlements to authenticated;
grant select (id, user_id, plan_id, status, provider, current_period_start, current_period_end, cancel_at_period_end, trial_ends_at, created_at, updated_at)
on public.user_subscriptions to authenticated;

create policy "plans_read_authenticated" on public.plans for select to authenticated using (true);
create policy "features_read_authenticated" on public.features for select to authenticated using (true);
create policy "plan_entitlements_read_authenticated" on public.plan_entitlements for select to authenticated using (true);
create policy "user_subscriptions_select_own" on public.user_subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

insert into public.plans (code, name, description, sort_order) values
  ('free', 'Free', 'Core tracking and accountability tools.', 0),
  ('premium', 'Premium', 'Expanded progress tools and future premium capabilities.', 1),
  ('coach', 'Coach', 'Premium capabilities plus future coach access.', 2)
on conflict (code) do update set name = excluded.name, description = excluded.description,
  sort_order = excluded.sort_order, is_active = true;

insert into public.features (code, name, description) values
  ('progress_tracking', 'Progress tracking', 'Weight and body measurement tracking.'),
  ('nutrition_tracking', 'Nutrition tracking', 'Food and macro tracking.'),
  ('water_tracking', 'Water tracking', 'Daily hydration logging.'),
  ('habits', 'Habits', 'Custom habits and completion tracking.'),
  ('daily_check_ins', 'Daily check-ins', 'Short daily reflections.'),
  ('weekly_check_ins', 'Weekly check-ins', 'Weekly reflections and focus planning.'),
  ('tfk_score', 'TFK Score', 'Explainable consistency score.'),
  ('progress_photos', 'Progress photos', 'Private progress photo storage.'),
  ('advanced_reports', 'Advanced reports', 'Future advanced reporting capability.'),
  ('coach_access', 'Coach access', 'Future coach-supported experience.'),
  ('ai_insights', 'AI insights', 'Future AI insight capability.'),
  ('glp1_journal', 'GLP-1 journal', 'Future GLP-1 journal capability.'),
  ('workouts', 'Workouts', 'Future workout capability.')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.plan_entitlements (plan_id, feature_id, enabled, limits)
select p.id, f.id, true,
  case
    when p.code = 'free' and f.code = 'progress_photos' then '{"max_active": 3}'::jsonb
    when f.code = 'progress_photos' then '{"max_active": null}'::jsonb
    else '{}'::jsonb
  end
from public.plans p
join public.features f on
  (p.code = 'free' and f.code in ('progress_tracking','nutrition_tracking','water_tracking','habits','daily_check_ins','weekly_check_ins','tfk_score','progress_photos'))
  or (p.code = 'premium' and f.code in ('progress_tracking','nutrition_tracking','water_tracking','habits','daily_check_ins','weekly_check_ins','tfk_score','progress_photos','advanced_reports','ai_insights','glp1_journal','workouts'))
  or (p.code = 'coach')
on conflict (plan_id, feature_id) do update set enabled = excluded.enabled, limits = excluded.limits;

create function public.get_current_entitlements()
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
  latest_subscription public.user_subscriptions;
  effective_subscription public.user_subscriptions;
  effective_plan public.plans;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  select us.* into latest_subscription
  from public.user_subscriptions us
  where us.user_id = caller_id
  order by us.created_at desc
  limit 1;

  select us.* into effective_subscription
  from public.user_subscriptions us
  where us.user_id = caller_id
    and us.status in ('active', 'trialing')
    and (us.current_period_end is null or us.current_period_end > now())
    and (us.status <> 'trialing' or us.trial_ends_at is null or us.trial_ends_at > now())
  order by us.created_at desc
  limit 1;

  select p.* into effective_plan
  from public.plans p
  where p.id = effective_subscription.plan_id and p.is_active
  limit 1;

  if effective_plan.id is null then
    select p.* into effective_plan from public.plans p where p.code = 'free' and p.is_active limit 1;
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

revoke all on function public.get_current_entitlements() from public, anon, authenticated;
grant execute on function public.get_current_entitlements() to authenticated;

create function public.admin_assign_internal_plan(target_user_id uuid, target_plan_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  selected_plan_id uuid;
  created_subscription_id uuid;
begin
  if caller_id is null or not exists (
    select 1 from public.user_roles ur where ur.user_id = caller_id and ur.role = 'admin'
  ) then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = target_user_id) then
    raise exception 'User not found' using errcode = '22023';
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

revoke all on function public.admin_assign_internal_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_assign_internal_plan(uuid, text) to authenticated;
