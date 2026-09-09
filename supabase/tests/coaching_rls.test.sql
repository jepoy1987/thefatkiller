begin;
create extension if not exists pgtap;
set local search_path=public,extensions,auth;
select plan(19);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','81111111-1111-4111-8111-111111111111','authenticated','authenticated','admin-coaching@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','82222222-2222-4222-8222-222222222222','authenticated','authenticated','coach-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','83333333-3333-4333-8333-333333333333','authenticated','authenticated','coach-b@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','84444444-4444-4444-8444-444444444444','authenticated','authenticated','client-coaching@example.test','',now(),'{}','{}',now(),now());
update public.user_roles set role='admin' where user_id='81111111-1111-4111-8111-111111111111';
update public.user_roles set role='coach' where user_id in ('82222222-2222-4222-8222-222222222222','83333333-3333-4333-8333-333333333333');
insert into public.progress_photos(user_id,storage_path) values('84444444-4444-4444-8444-444444444444','84444444-4444-4444-8444-444444444444/test.jpg');
insert into public.user_subscriptions(user_id,plan_id,status,provider) select u.id,p.id,'active','internal' from (values('82222222-2222-4222-8222-222222222222'::uuid),('83333333-3333-4333-8333-333333333333'::uuid))u(id) cross join public.plans p where p.code='coach';
set local role authenticated;
select set_config('request.jwt.claim.sub','81111111-1111-4111-8111-111111111111',true);
select lives_ok($$select public.admin_assign_coach_client('82222222-2222-4222-8222-222222222222','84444444-4444-4444-8444-444444444444')$$,'Admin assigns relationship');
select is((select status::text from public.coach_client_relationships limit 1),'active','Relationship is active');
select set_config('request.jwt.claim.sub','82222222-2222-4222-8222-222222222222',true);
select is((select count(*)::int from public.coach_client_relationships),1,'Assigned coach sees relationship');
select lives_ok($$select public.get_coach_client_summary('84444444-4444-4444-8444-444444444444')$$,'Assigned coach reads summary');
select lives_ok($$select public.save_coach_goal('84444444-4444-4444-8444-444444444444','Log breakfast','Weekly focus','nutrition',current_date+7,'normal',true)$$,'Assigned coach creates goal');
select lives_ok($$select public.save_coach_note('84444444-4444-4444-8444-444444444444','Private context',false)$$,'Assigned coach creates private note');
select lives_ok($$select public.save_coach_note('84444444-4444-4444-8444-444444444444','Shared encouragement',true)$$,'Assigned coach creates visible note');
select set_config('request.jwt.claim.sub','83333333-3333-4333-8333-333333333333',true);
select is((select count(*)::int from public.coach_client_relationships),0,'Other coach cannot see relationship');
select throws_ok($$select public.get_coach_client_summary('84444444-4444-4444-8444-444444444444')$$,'42501',null,'Unassigned coach rejected');
select is((select count(*)::int from public.coach_goals),0,'Other coach cannot see goals');
select is((select count(*)::int from public.coach_notes),0,'Other coach cannot see notes');
select set_config('request.jwt.claim.sub','84444444-4444-4444-8444-444444444444',true);
select is((select count(*)::int from public.coach_client_relationships),1,'Client sees own relationship');
select is((select count(*)::int from public.coach_goals),1,'Client sees visible goal');
select is((select count(*)::int from public.coach_notes),1,'Client sees only visible note');
select throws_ok($$update public.coach_goals set title='Forged'$$,'42501',null,'Client cannot mutate coach goals');
select throws_ok($$select public.get_coach_client_summary('84444444-4444-4444-8444-444444444444')$$,'42501',null,'Normal user rejected from coach resolver');
select set_config('request.jwt.claim.sub','82222222-2222-4222-8222-222222222222',true);
select is((public.get_coach_client_summary('84444444-4444-4444-8444-444444444444')->'glp1_summary')::text,'null','GLP-1 summary blocked by default');
select is((select count(*)::int from public.progress_photos),0,'Coach cannot read client progress photos');
select set_config('request.jwt.claim.sub','84444444-4444-4444-8444-444444444444',true);
update public.coaching_privacy_settings set share_glp1_summary=true where user_id='84444444-4444-4444-8444-444444444444';
select set_config('request.jwt.claim.sub','82222222-2222-4222-8222-222222222222',true);
select isnt((public.get_coach_client_summary('84444444-4444-4444-8444-444444444444')->'glp1_summary')::text,'null','GLP-1 bounded summary enabled after consent');
select * from finish();
rollback;
