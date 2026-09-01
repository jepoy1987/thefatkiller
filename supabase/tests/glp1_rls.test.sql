begin;
create extension if not exists pgtap;
set local search_path = public, extensions, auth;
select plan(24);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','71111111-1111-4111-8111-111111111111','authenticated','authenticated','glp1-premium@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','72222222-2222-4222-8222-222222222222','authenticated','authenticated','glp1-coach@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','73333333-3333-4333-8333-333333333333','authenticated','authenticated','glp1-free@example.test','',now(),'{}','{}',now(),now());
insert into public.user_subscriptions(user_id,plan_id,status,provider)
select '71111111-1111-4111-8111-111111111111',id,'active','internal' from public.plans where code='premium';
insert into public.user_subscriptions(user_id,plan_id,status,provider)
select '72222222-2222-4222-8222-222222222222',id,'active','internal' from public.plans where code='coach';

set local role authenticated;
select set_config('request.jwt.claim.sub','73333333-3333-4333-8333-333333333333',true);
select throws_ok($$insert into public.glp1_medication_profiles(user_id,medication_name) values('73333333-3333-4333-8333-333333333333','semaglutide')$$,'42501',null,'Free cannot create a medication profile');
select is(public.has_current_feature('glp1_journal'),false,'Free does not have GLP-1 entitlement');

select set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
select is(public.has_current_feature('glp1_journal'),true,'Premium has GLP-1 entitlement');
select lives_ok($$insert into public.glp1_medication_profiles(id,user_id,medication_name,prescribed_schedule) values('71111111-aaaa-4111-8111-111111111111','71111111-1111-4111-8111-111111111111','semaglutide','weekly')$$,'Premium can create own profile');

select set_config('request.jwt.claim.sub','72222222-2222-4222-8222-222222222222',true);
select is(public.has_current_feature('glp1_journal'),true,'Coach has GLP-1 entitlement');
select lives_ok($$insert into public.glp1_medication_profiles(id,user_id,medication_name) values('72222222-bbbb-4222-8222-222222222222','72222222-2222-4222-8222-222222222222','tirzepatide')$$,'Coach can create own profile');

select set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
select is((select count(*)::int from public.glp1_medication_profiles),1,'owner reads own medication profile only');
with changed as (update public.glp1_medication_profiles set notes='forged' where id='72222222-bbbb-4222-8222-222222222222' returning 1) select is((select count(*)::int from changed),0,'cross-user profile update is blocked');
select lives_ok($$update public.glp1_medication_profiles set notes='own' where id='71111111-aaaa-4111-8111-111111111111'$$,'owner can update profile');
select lives_ok($$insert into public.glp1_dose_logs(id,user_id,medication_profile_id,event_type,dose_amount,dose_unit,taken_at) values('71111111-dddd-4111-8111-111111111111','71111111-1111-4111-8111-111111111111','71111111-aaaa-4111-8111-111111111111','taken',2.5,'mg',now())$$,'owner can create dose log');
select throws_ok($$insert into public.glp1_dose_logs(user_id,medication_profile_id,event_type,taken_at) values('71111111-1111-4111-8111-111111111111','72222222-bbbb-4222-8222-222222222222','missed',now())$$,'42501',null,'dose cannot use another user profile');
select is((select count(*)::int from public.glp1_dose_logs),1,'owner reads own dose logs only');

select set_config('request.jwt.claim.sub','72222222-2222-4222-8222-222222222222',true);
select is((select count(*)::int from public.glp1_dose_logs),0,'cross-user dose reads are blocked');
select lives_ok($$insert into public.glp1_dose_logs(id,user_id,medication_profile_id,event_type,taken_at) values('72222222-eeee-4222-8222-222222222222','72222222-2222-4222-8222-222222222222','72222222-bbbb-4222-8222-222222222222','skipped',now())$$,'Coach can record skipped event without dose');

select set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
select lives_ok($$insert into public.glp1_symptom_logs(id,user_id,medication_profile_id,dose_log_id,logged_at,nausea) values('71111111-ffff-4111-8111-111111111111','71111111-1111-4111-8111-111111111111','71111111-aaaa-4111-8111-111111111111','71111111-dddd-4111-8111-111111111111',now(),3)$$,'owner can create linked symptom log');
select throws_ok($$insert into public.glp1_symptom_logs(user_id,medication_profile_id,logged_at,nausea) values('71111111-1111-4111-8111-111111111111','72222222-bbbb-4222-8222-222222222222',now(),2)$$,'42501',null,'symptom cannot use another user profile');
select throws_ok($$insert into public.glp1_symptom_logs(user_id,medication_profile_id,dose_log_id,logged_at,nausea) values('71111111-1111-4111-8111-111111111111','71111111-aaaa-4111-8111-111111111111','72222222-eeee-4222-8222-222222222222',now(),2)$$,'42501',null,'symptom cannot use another user dose');
select is((select count(*)::int from public.glp1_symptom_logs),1,'owner reads own symptom logs only');

select set_config('request.jwt.claim.sub','72222222-2222-4222-8222-222222222222',true);
select is((select count(*)::int from public.glp1_symptom_logs),0,'cross-user symptom reads are blocked');
select set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
select lives_ok($$delete from public.glp1_symptom_logs where id='71111111-ffff-4111-8111-111111111111'$$,'owner can delete symptom log');
select lives_ok($$delete from public.glp1_dose_logs where id='71111111-dddd-4111-8111-111111111111'$$,'owner can delete dose log');
select lives_ok($$delete from public.glp1_medication_profiles where id='71111111-aaaa-4111-8111-111111111111'$$,'owner can delete medication profile');

select set_config('request.jwt.claim.sub','73333333-3333-4333-8333-333333333333',true);
select is((select count(*)::int from public.glp1_medication_profiles),0,'Free cannot read another user journal');
set local role anon;
select throws_ok($$select count(*) from public.glp1_medication_profiles$$,'42501',null,'anonymous access is denied');

select * from finish();
rollback;
