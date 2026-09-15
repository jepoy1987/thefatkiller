begin;
set local search_path=public,extensions;
select plan(9);

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('b1411111-1111-4111-8111-111111111111','authenticated','authenticated','backup-a@local.test','{}','{}'),
('b1422222-2222-4222-8222-222222222222','authenticated','authenticated','backup-b@local.test','{}','{}');

insert into public.progress_photos(id,user_id,storage_path) values
('b1433333-3333-4333-8333-333333333333','b1411111-1111-4111-8111-111111111111','b1411111-1111-4111-8111-111111111111/progress.jpg'),
('b1444444-4444-4444-8444-444444444444','b1422222-2222-4222-8222-222222222222','b1422222-2222-4222-8222-222222222222/deleting.jpg'),
('b1488888-8888-4888-8888-888888888888','b1411111-1111-4111-8111-111111111111','b1411111-1111-4111-8111-111111111111/missing.jpg');
insert into public.food_photo_analyses(id,user_id,status,expires_at,storage_path) values
('b1455555-5555-4555-8555-555555555555','b1411111-1111-4111-8111-111111111111','failed',clock_timestamp()+interval '1 hour','b1411111-1111-4111-8111-111111111111/b1455555-5555-4555-8555-555555555555-1.jpg'),
('b1466666-6666-4666-8666-666666666666','b1411111-1111-4111-8111-111111111111','pending',clock_timestamp()-interval '1 hour','b1411111-1111-4111-8111-111111111111/b1466666-6666-4666-8666-666666666666-1.jpg'),
('b1477777-7777-4777-8777-777777777777','b1411111-1111-4111-8111-111111111111','completed',clock_timestamp()+interval '1 hour','b1411111-1111-4111-8111-111111111111/b1477777-7777-4777-8777-777777777777-1.jpg');
insert into storage.objects(bucket_id,name) values
('progress-photos','b1411111-1111-4111-8111-111111111111/progress.jpg'),
('progress-photos','b1422222-2222-4222-8222-222222222222/deleting.jpg'),
('food-analysis','b1411111-1111-4111-8111-111111111111/b1455555-5555-4555-8555-555555555555-1.jpg'),
('food-analysis','b1411111-1111-4111-8111-111111111111/b1466666-6666-4666-8666-666666666666-1.jpg'),
('food-analysis','b1411111-1111-4111-8111-111111111111/b1477777-7777-4777-8777-777777777777-1.jpg');
insert into private.account_deletions(user_id) values('b1422222-2222-4222-8222-222222222222');

select is((select count(*)::integer from public.storage_backup_candidates('', '', 100)),3,'Only progress and retention-eligible food references are selected');
select is((select count(*)::integer from public.storage_backup_candidates('', '', 100) where object_path like '%/missing.jpg' and storage_id is null),1,'Missing source object is exposed as an export failure candidate');
select is((select count(*)::integer from public.storage_backup_candidates('', '', 1)),1,'Inventory page bound is enforced');
select throws_ok($$select * from public.storage_backup_candidates('', '', 101)$$,'22023',null,'Oversized inventory page is rejected');
select ok(public.storage_backup_candidate_current(
  'food-analysis',
  'b1411111-1111-4111-8111-111111111111/b1455555-5555-4555-8555-555555555555-1.jpg',
  'b1455555-5555-4555-8555-555555555555',
  (select id::text from storage.objects where name like '%b1455555-5555-4555-8555-555555555555%'),
  (select updated_at from storage.objects where name like '%b1455555-5555-4555-8555-555555555555%')
),'Current eligible object passes the post-download fence');
update public.food_photo_analyses set expires_at=clock_timestamp()-interval '1 second' where id='b1455555-5555-4555-8555-555555555555';
select ok(not public.storage_backup_candidate_current(
  'food-analysis',
  'b1411111-1111-4111-8111-111111111111/b1455555-5555-4555-8555-555555555555-1.jpg',
  'b1455555-5555-4555-8555-555555555555',
  (select id::text from storage.objects where name like '%b1455555-5555-4555-8555-555555555555%'),
  (select updated_at from storage.objects where name like '%b1455555-5555-4555-8555-555555555555%')
),'Food object expiry invalidates an in-flight export');
select is((select count(*)::integer from public.storage_backup_candidates('', '', 100)),2,'Expired food object disappears from inventory');
select ok(not has_function_privilege('authenticated','public.storage_backup_candidates(text,text,integer)','EXECUTE'),'Authenticated clients cannot inventory backups');
select ok(not has_function_privilege('authenticated','public.storage_backup_candidate_current(text,text,uuid,text,timestamptz)','EXECUTE'),'Authenticated clients cannot use the export fence');

select * from finish();
rollback;
