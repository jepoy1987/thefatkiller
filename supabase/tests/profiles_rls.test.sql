begin;
select plan(10);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@example.test', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'b@example.test', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select is((select count(*)::int from public.profiles), 1, 'A reads only A');
select is((select id from public.profiles), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'A reads A');
update public.profiles set display_name = 'User A' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select display_name from public.profiles), 'User A', 'A modifies allowed field');
update public.profiles set display_name = 'Nope' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select is((select count(*)::int from public.profiles where display_name = 'Nope'), 0, 'A cannot modify B');
select throws_ok($$update public.user_roles set role = 'admin' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$, '42501', null, 'A cannot elevate role');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select is((select count(*)::int from public.profiles), 1, 'B reads only B');
select is((select id from public.profiles), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'B reads B');
update public.profiles set unit_system = 'imperial' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select is((select unit_system::text from public.profiles), 'imperial', 'B modifies allowed field');
update public.profiles set display_name = 'Nope' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select count(*)::int from public.profiles where display_name = 'Nope'), 0, 'B cannot modify A');
select throws_ok($$update public.user_roles set role = 'coach' where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$, '42501', null, 'B cannot elevate role');

select * from finish();
rollback;
