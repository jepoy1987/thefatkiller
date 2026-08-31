begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'tfk-rls-a@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'tfk-rls-b@example.invalid', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

do $$
declare
  visible_count integer;
  affected_count integer;
begin
  select count(*) into visible_count from public.profiles;
  if visible_count <> 1 then
    raise exception 'User A expected one visible profile, got %', visible_count;
  end if;

  update public.profiles set display_name = 'RLS User A'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics affected_count = row_count;
  if affected_count <> 1 then
    raise exception 'User A could not update own profile';
  end if;

  update public.profiles set display_name = 'Forbidden'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics affected_count = row_count;
  if affected_count <> 0 then
    raise exception 'User A updated User B profile';
  end if;

  begin
    update public.user_roles set role = 'admin'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'User A unexpectedly elevated role';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);

do $$
declare
  visible_count integer;
  affected_count integer;
begin
  select count(*) into visible_count from public.profiles;
  if visible_count <> 1 then
    raise exception 'User B expected one visible profile, got %', visible_count;
  end if;

  update public.profiles set unit_system = 'imperial'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics affected_count = row_count;
  if affected_count <> 1 then
    raise exception 'User B could not update own profile';
  end if;

  update public.profiles set display_name = 'Forbidden'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics affected_count = row_count;
  if affected_count <> 0 then
    raise exception 'User B updated User A profile';
  end if;

  begin
    update public.user_roles set role = 'coach'
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    raise exception 'User B unexpectedly elevated role';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
