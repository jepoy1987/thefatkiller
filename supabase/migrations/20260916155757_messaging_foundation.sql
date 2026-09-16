-- Phase A.1 messaging foundation. AI modes and audit storage are scaffolded,
-- but the database constraint below keeps every conversation in off mode.
create type public.conversation_status as enum ('active', 'closed');
create type public.conversation_participant_role as enum ('client', 'coach');
create type public.message_origin as enum ('client', 'coach', 'ai_assistant', 'system');
create type public.conversation_ai_mode as enum ('off', 'coach_draft', 'client_facing');
create type public.ai_consent_status as enum ('not_requested', 'granted', 'declined', 'revoked');
create type private.ai_generation_status as enum ('requested', 'running', 'completed', 'failed', 'blocked');
create type private.ai_safety_result as enum ('not_evaluated', 'passed', 'blocked', 'review_required');
create type private.ai_human_review_status as enum ('not_required', 'pending', 'approved', 'rejected');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coach_client_relationships(id) on delete cascade,
  status public.conversation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check ((status = 'closed' and closed_at is not null) or (status = 'active' and closed_at is null))
);
create unique index conversations_one_active_relationship_idx
  on public.conversations(relationship_id) where status = 'active';
create index conversations_relationship_created_idx
  on public.conversations(relationship_id, created_at desc);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_role public.conversation_participant_role not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);
create unique index conversation_participants_one_role_idx
  on public.conversation_participants(conversation_id, participant_role)
  where left_at is null;
create index conversation_participants_user_active_idx
  on public.conversation_participants(user_id, conversation_id) where left_at is null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  origin public.message_origin not null,
  author_user_id uuid references auth.users(id) on delete restrict,
  body text not null,
  reply_to_message_id uuid,
  ai_assistance_audit_id uuid,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique (id, conversation_id),
  foreign key (reply_to_message_id, conversation_id)
    references public.messages(id, conversation_id) on delete restrict,
  check (char_length(btrim(body)) between 1 and 4000),
  check (
    (origin in ('client', 'coach') and author_user_id is not null)
    or (origin in ('ai_assistant', 'system') and author_user_id is null)
  ),
  constraint messages_phase_a_human_only check (origin in ('client', 'coach')),
  check (edited_at is null and deleted_at is null)
);
create index messages_conversation_created_idx
  on public.messages(conversation_id, created_at, id);
create index messages_author_created_idx
  on public.messages(author_user_id, created_at desc) where author_user_id is not null;

create table public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index message_receipts_user_unread_idx on public.message_receipts(user_id, read_at desc);

create table public.conversation_ai_settings (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  mode public.conversation_ai_mode not null default 'off',
  consent_status public.ai_consent_status not null default 'not_requested',
  consented_at timestamptz,
  consent_version text,
  consent_purpose text,
  paused_at timestamptz,
  paused_by uuid references auth.users(id) on delete set null,
  disabled_at timestamptz,
  disabled_by uuid references auth.users(id) on delete set null,
  disabled_reason text,
  updated_at timestamptz not null default now(),
  -- Phase A guarantee: consent cannot activate any AI mode.
  constraint conversation_ai_phase_a_off check (mode = 'off'),
  check ((consent_status = 'granted' and consented_at is not null and consent_version is not null and consent_purpose is not null)
    or consent_status <> 'granted'),
  check (paused_at is not null or paused_by is null),
  check ((disabled_at is null and disabled_by is null and disabled_reason is null)
    or (disabled_at is not null and char_length(btrim(disabled_reason)) between 1 and 500)),
  check (consent_version is null or char_length(consent_version) between 1 and 100),
  check (consent_purpose is null or char_length(consent_purpose) between 1 and 500)
);

create table private.conversation_ai_setting_events (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'changed')),
  previous_mode public.conversation_ai_mode,
  mode public.conversation_ai_mode not null,
  previous_consent_status public.ai_consent_status,
  consent_status public.ai_consent_status not null,
  consent_version text,
  occurred_at timestamptz not null default now()
);
create index conversation_ai_events_conversation_idx
  on private.conversation_ai_setting_events(conversation_id, occurred_at desc);

create table private.ai_generation_audits (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  generated_message_id uuid unique,
  provider text not null check (char_length(provider) between 1 and 100),
  model_identifier text not null check (char_length(model_identifier) between 1 and 200),
  prompt_version text not null check (char_length(prompt_version) between 1 and 100),
  generation_status private.ai_generation_status not null default 'requested',
  safety_result private.ai_safety_result not null default 'not_evaluated',
  safety_policy_version text check (safety_policy_version is null or char_length(safety_policy_version) between 1 and 100),
  human_review_status private.ai_human_review_status not null default 'not_required',
  reviewer_user_id uuid references auth.users(id) on delete set null,
  provider_request_id text check (provider_request_id is null or char_length(provider_request_id) <= 200),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  cost_micros bigint check (cost_micros is null or cost_micros >= 0),
  cost_currency char(3),
  error_code text check (error_code is null or char_length(error_code) <= 100),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  reviewed_at timestamptz,
  check (reviewed_at is not null or reviewer_user_id is null),
  check (cost_currency is null or cost_micros is not null),
  unique (id, conversation_id),
  foreign key (generated_message_id, conversation_id)
    references public.messages(id, conversation_id) on delete set null (generated_message_id)
);
create index ai_generation_audits_conversation_idx
  on private.ai_generation_audits(conversation_id, requested_at desc);

create table private.ai_generation_inputs (
  generation_id uuid not null,
  message_id uuid not null,
  conversation_id uuid not null,
  input_order smallint not null check (input_order >= 0),
  primary key (generation_id, message_id),
  unique (generation_id, input_order),
  foreign key (generation_id, conversation_id)
    references private.ai_generation_audits(id, conversation_id) on delete cascade,
  foreign key (message_id, conversation_id)
    references public.messages(id, conversation_id) on delete restrict
);
create index ai_generation_inputs_message_idx on private.ai_generation_inputs(message_id);

alter table public.messages add constraint messages_ai_assistance_audit_fk
  foreign key (ai_assistance_audit_id, conversation_id)
  references private.ai_generation_audits(id, conversation_id) on delete set null (ai_assistance_audit_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.conversation_ai_settings enable row level security;
alter table private.conversation_ai_setting_events enable row level security;
alter table private.ai_generation_audits enable row level security;
alter table private.ai_generation_inputs enable row level security;

revoke all on public.conversations, public.conversation_participants, public.messages,
  public.message_receipts, public.conversation_ai_settings from public, anon, authenticated;
revoke all on private.conversation_ai_setting_events, private.ai_generation_audits,
  private.ai_generation_inputs from public, anon, authenticated;
grant select on public.conversations, public.conversation_participants, public.messages,
  public.message_receipts, public.conversation_ai_settings to authenticated;
grant insert, update (read_at) on public.message_receipts to authenticated;
grant select, insert, update on private.ai_generation_audits to service_role;
grant select, insert on private.ai_generation_inputs to service_role;
grant select on private.conversation_ai_setting_events to service_role;

create function private.is_active_conversation_participant(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null and exists (
    select 1
    from public.conversations c
    join public.coach_client_relationships r on r.id = c.relationship_id
    join public.conversation_participants cp on cp.conversation_id = c.id
    where c.id = target_conversation_id
      and c.status = 'active'
      and r.status = 'active'
      and cp.user_id = target_user_id
      and cp.left_at is null
      and (
        (cp.participant_role = 'client' and r.client_user_id = target_user_id)
        or (
          cp.participant_role = 'coach'
          and r.coach_user_id = target_user_id
          and exists (
            select 1 from public.user_roles ur
            join public.user_subscriptions us on us.user_id = ur.user_id
            join public.plans p on p.id = us.plan_id and p.is_active
            join public.plan_entitlements pe on pe.plan_id = p.id and pe.enabled
            join public.features f on f.id = pe.feature_id and f.code = 'coach_access'
            where ur.user_id = target_user_id and ur.role = 'coach'
              and us.status in ('active', 'trialing')
              and (us.current_period_end is null or us.current_period_end > now())
              and (us.status <> 'trialing' or us.trial_ends_at is null or us.trial_ends_at > now())
          )
        )
      )
  );
$$;
revoke all on function private.is_active_conversation_participant(uuid, uuid) from public, anon, authenticated;
grant execute on function private.is_active_conversation_participant(uuid, uuid) to authenticated;

create policy conversations_participant_read on public.conversations for select to authenticated
  using (private.is_active_conversation_participant(id, (select auth.uid())));
create policy conversation_participants_participant_read on public.conversation_participants for select to authenticated
  using (private.is_active_conversation_participant(conversation_id, (select auth.uid())));
create policy messages_participant_read on public.messages for select to authenticated
  using (private.is_active_conversation_participant(conversation_id, (select auth.uid())));
create policy message_receipts_participant_read on public.message_receipts for select to authenticated
  using (exists (
    select 1 from public.messages m
    where m.id = message_id
      and private.is_active_conversation_participant(m.conversation_id, (select auth.uid()))
  ));
create policy message_receipts_receiver_insert on public.message_receipts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.author_user_id is distinct from (select auth.uid())
        and private.is_active_conversation_participant(m.conversation_id, (select auth.uid()))
    )
  );
create policy message_receipts_receiver_update on public.message_receipts for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.author_user_id is distinct from (select auth.uid())
        and private.is_active_conversation_participant(m.conversation_id, (select auth.uid()))
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.author_user_id is distinct from (select auth.uid())
        and private.is_active_conversation_participant(m.conversation_id, (select auth.uid()))
    )
  );
create policy conversation_ai_settings_participant_read on public.conversation_ai_settings for select to authenticated
  using (private.is_active_conversation_participant(conversation_id, (select auth.uid())));

create function private.validate_conversation_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.conversations c
    join public.coach_client_relationships r on r.id = c.relationship_id
    where c.id = new.conversation_id
      and ((new.participant_role = 'client' and new.user_id = r.client_user_id)
        or (new.participant_role = 'coach' and new.user_id = r.coach_user_id))
  ) then
    raise exception 'Participant must match the coaching relationship' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_conversation_participant() from public, anon, authenticated;
create trigger conversation_participants_validate
  before insert or update on public.conversation_participants
  for each row execute function private.validate_conversation_participant();

create function private.prevent_message_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Messages are immutable in Phase A' using errcode = '55000';
end;
$$;
revoke all on function private.prevent_message_mutation() from public, anon, authenticated;
create trigger messages_immutable
  before update or delete on public.messages
  for each row execute function private.prevent_message_mutation();

create function private.preserve_receipt_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.message_id is distinct from old.message_id or new.user_id is distinct from old.user_id then
    raise exception 'Receipt identity is immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;
revoke all on function private.preserve_receipt_identity() from public, anon, authenticated;
create trigger message_receipts_preserve_identity
  before update on public.message_receipts
  for each row execute function private.preserve_receipt_identity();

create function private.log_conversation_ai_setting_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.conversation_ai_setting_events(
    conversation_id, actor_user_id, event_type, previous_mode, mode,
    previous_consent_status, consent_status, consent_version
  ) values (
    new.conversation_id, auth.uid(), case when tg_op = 'INSERT' then 'created' else 'changed' end,
    case when tg_op = 'UPDATE' then old.mode end, new.mode,
    case when tg_op = 'UPDATE' then old.consent_status end, new.consent_status, new.consent_version
  );
  return new;
end;
$$;
revoke all on function private.log_conversation_ai_setting_event() from public, anon, authenticated;
create trigger conversation_ai_settings_audit
  after insert or update on public.conversation_ai_settings
  for each row execute function private.log_conversation_ai_setting_event();

create function private.prevent_ai_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'AI setting events are append-only' using errcode = '55000';
end;
$$;
revoke all on function private.prevent_ai_event_mutation() from public, anon, authenticated;
create trigger conversation_ai_setting_events_append_only
  before update or delete on private.conversation_ai_setting_events
  for each row execute function private.prevent_ai_event_mutation();

create function public.get_or_create_conversation(p_relationship_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  relationship public.coach_client_relationships;
  saved public.conversations;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select r.* into relationship
  from public.coach_client_relationships r
  where r.id = p_relationship_id and r.status = 'active';
  if not found then
    raise exception 'Active coaching relationship required' using errcode = '42501';
  end if;
  if actor = relationship.client_user_id then
    if not exists (select 1 from public.user_roles ur where ur.user_id = actor and ur.role = 'user') then
      raise exception 'Client role required' using errcode = '42501';
    end if;
  elsif actor = relationship.coach_user_id then
    if not private.current_user_has_coach_access() then
      raise exception 'Coach access required' using errcode = '42501';
    end if;
  else
    raise exception 'Conversation participant required' using errcode = '42501';
  end if;

  select c.* into saved from public.conversations c
  where c.relationship_id = p_relationship_id and c.status = 'active';
  if not found then
    begin
      insert into public.conversations(relationship_id) values (p_relationship_id) returning * into saved;
    exception when unique_violation then
      select c.* into strict saved from public.conversations c
      where c.relationship_id = p_relationship_id and c.status = 'active';
    end;
  end if;

  insert into public.conversation_participants(conversation_id, user_id, participant_role)
  values (saved.id, relationship.client_user_id, 'client'), (saved.id, relationship.coach_user_id, 'coach')
  on conflict (conversation_id, user_id) do nothing;
  insert into public.conversation_ai_settings(conversation_id) values (saved.id)
  on conflict (conversation_id) do nothing;
  return saved;
end;
$$;
revoke all on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

create function public.send_message(p_conversation_id uuid, p_body text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_role public.conversation_participant_role;
  saved public.messages;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'Message body must contain between 1 and 4000 characters' using errcode = '22023';
  end if;
  if not private.is_active_conversation_participant(p_conversation_id, actor) then
    raise exception 'Active conversation membership required' using errcode = '42501';
  end if;
  select cp.participant_role into strict actor_role
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id and cp.user_id = actor and cp.left_at is null;
  insert into public.messages(conversation_id, origin, author_user_id, body)
  values (p_conversation_id, actor_role::text::public.message_origin, actor, btrim(p_body))
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.send_message(uuid, text) from public, anon;
grant execute on function public.send_message(uuid, text) to authenticated;

create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger conversation_ai_settings_set_updated_at before update on public.conversation_ai_settings
  for each row execute function public.set_updated_at();

-- Postgres Changes applies the messages SELECT RLS policy to every subscriber.
-- No Broadcast/Presence policy or public channel is enabled here.
alter publication supabase_realtime add table public.messages;
