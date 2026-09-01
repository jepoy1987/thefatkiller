begin;
create extension if not exists pgtap;
set local search_path = public, extensions, auth;
select plan(22);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','61616161-6161-4616-8616-616161616161','authenticated','authenticated','plans-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','62626262-6262-4626-8626-626262626262','authenticated','authenticated','plans-b@example.test','',now(),'{}','{}',now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','61616161-6161-4616-8616-616161616161',true);
select is((select count(*)::int from public.plans),3,'authenticated users read the plan catalog');
select is((select count(*)::int from public.features),13,'authenticated users read feature definitions');
select is((select count(*)::int from public.plan_entitlements),33,'authenticated users read the plan matrix');
select is((select plan_code from public.get_current_entitlements()),'free','no subscription resolves Free');
select is((select (limits->'progress_photos'->>'max_active')::int from public.get_current_entitlements()),3,'Free resolves a three-photo limit');
select throws_ok($$insert into public.plans(code,name) values('self_upgrade','Nope')$$,'42501',null,'normal users cannot add plans');
select throws_ok($$update public.plans set name='Changed' where code='free'$$,'42501',null,'normal users cannot modify plans');
select throws_ok($$insert into public.user_subscriptions(user_id,plan_id,status,provider) select '61616161-6161-4616-8616-616161616161',id,'active','internal' from public.plans where code='premium'$$,'42501',null,'users cannot self-upgrade');
select throws_ok($$select public.admin_assign_internal_plan('61616161-6161-4616-8616-616161616161','premium')$$,'42501',null,'non-admin cannot use staging assignment');
select throws_ok($$select provider_customer_id from public.user_subscriptions$$,'42501',null,'provider identifiers are not exposed');

reset role;
insert into public.user_subscriptions(user_id,plan_id,status,provider)
select '61616161-6161-4616-8616-616161616161',id,'active','internal' from public.plans where code='premium';
set local role authenticated;
select set_config('request.jwt.claim.sub','61616161-6161-4616-8616-616161616161',true);
select is((select plan_code from public.get_current_entitlements()),'premium','active Premium resolves Premium');
select ok((select limits->'progress_photos'->'max_active' = 'null'::jsonb from public.get_current_entitlements()),'Premium photo limit is unlimited');

select set_config('request.jwt.claim.sub','62626262-6262-4626-8626-626262626262',true);
select is((select count(*)::int from public.user_subscriptions),0,'users cannot read another subscription');
with changed as (update public.user_subscriptions set status='active' returning 1)
select is((select count(*)::int from changed),0,'users cannot update subscriptions');

reset role;
update public.user_subscriptions set status='canceled' where user_id='61616161-6161-4616-8616-616161616161';
set local role authenticated;
select set_config('request.jwt.claim.sub','61616161-6161-4616-8616-616161616161',true);
select is((select plan_code from public.get_current_entitlements()),'free','canceled paid access falls back to Free');
select is((select subscription_status::text from public.get_current_entitlements()),'canceled','fallback retains latest subscription status');

reset role;
update public.user_roles set role='admin' where user_id='61616161-6161-4616-8616-616161616161';
set local role authenticated;
select set_config('request.jwt.claim.sub','61616161-6161-4616-8616-616161616161',true);
select lives_ok($$select public.admin_assign_internal_plan('62626262-6262-4626-8626-626262626262','coach')$$,'verified admin can assign an internal plan');
select set_config('request.jwt.claim.sub','62626262-6262-4626-8626-626262626262',true);
select is((select plan_code from public.get_current_entitlements()),'coach','admin assignment resolves Coach for target user');
select ok((select is_internal_test from public.get_current_entitlements()),'internal assignment is identified as a test plan');
select throws_ok($$select public.admin_assign_internal_plan('62626262-6262-4626-8626-626262626262','premium')$$,'42501',null,'target user still cannot assign a plan');

reset role;
select throws_ok($$insert into public.user_subscriptions(user_id,plan_id,status,provider) select '62626262-6262-4626-8626-626262626262',id,'trialing','manual' from public.plans where code='premium'$$,'23505',null,'only one non-terminal subscription is allowed');
select is((select count(*)::int from public.user_roles where role='coach'),0,'roles remain separate from Coach plan assignments');

select * from finish();
rollback;
