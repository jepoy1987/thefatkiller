begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(8);
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('a1411111-1111-4111-8111-111111111111','authenticated','authenticated','rate-a@local.test','{}','{}'),
('a1422222-2222-4222-8222-222222222222','authenticated','authenticated','rate-b@local.test','{}','{}');
select set_config('request.jwt.claim.sub','a1411111-1111-4111-8111-111111111111',true);
select lives_ok($$select private.claim_report_read() from generate_series(1,30)$$,'Exactly thirty reads allowed');
select throws_ok($$select private.claim_report_read()$$,'54000','Report rate limit reached','Thirty-first read rejected');
select is((select cardinality(calls) from private.report_read_limits where user_id=auth.uid()),30,'Budget storage remains bounded');
select set_config('request.jwt.claim.sub','a1422222-2222-4222-8222-222222222222',true);
select lives_ok($$select private.claim_report_read()$$,'Other owner has independent budget');
select ok(not has_table_privilege('authenticated','private.report_read_limits','SELECT'),'Owner cannot read private budget table');
select ok(not has_function_privilege('authenticated','private.claim_report_read()','EXECUTE'),'Budget function not publicly callable');
update private.report_read_limits set calls=array[clock_timestamp()-interval '2 minutes'] where user_id=auth.uid();
select lives_ok($$select private.claim_report_read()$$,'Expired budget pruned on next read');
select is((select cardinality(calls) from private.report_read_limits where user_id=auth.uid()),1,'Old timestamps discarded');
select * from finish();
rollback;
