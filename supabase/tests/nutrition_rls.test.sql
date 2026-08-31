begin;
set local search_path = public, extensions, auth;
select plan(20);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','11111111-1111-4111-8111-111111111111','authenticated','authenticated','nutrition-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','22222222-2222-4222-8222-222222222222','authenticated','authenticated','nutrition-b@example.test','',now(),'{}','{}',now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
update public.profiles set timezone='Asia/Manila' where id='11111111-1111-4111-8111-111111111111';
insert into public.foods(owner_user_id,name,source,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g)
values('11111111-1111-4111-8111-111111111111','Oats','manual',40,'g',150,5,27,3);
select is((select count(*)::int from public.foods),1,'A reads own food');
select throws_ok($$insert into public.foods(owner_user_id,name,source,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g) values('22222222-2222-4222-8222-222222222222','Forbidden','manual',1,'serving',1,1,1,1)$$,'42501',null,'A cannot create B food');

insert into public.food_logs(user_id,food_id,meal_type,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,logged_at)
select '11111111-1111-4111-8111-111111111111',id,'breakfast',name,1,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g,'2026-08-31T00:30:00+08' from public.foods;
insert into public.water_logs(user_id,amount_ml,logged_at) values('11111111-1111-4111-8111-111111111111',500,'2026-08-31T20:00:00+08');
select is((select count(*)::int from public.food_logs),1,'A reads own food log');
select is((select count(*)::int from public.water_logs),1,'A reads own water log');
update public.foods set name='Renamed oats',calories=999;
select is((select food_name_snapshot from public.food_logs limit 1),'Oats','Food log name snapshot is immutable');
select is((select calories::int from public.food_logs limit 1),150,'Food log nutrition snapshot is immutable');
select is((select calories::int from public.get_daily_nutrition('2026-08-31')),150,'Daily calories use profile timezone');
select is((select water_ml::int from public.get_daily_nutrition('2026-08-31')),500,'Daily water uses profile timezone');
select is((select calories::int from public.get_daily_nutrition('2026-08-30')),0,'Adjacent local day excludes nutrition');

insert into public.saved_meals(user_id,name) values('11111111-1111-4111-8111-111111111111','Breakfast combo');
insert into public.saved_meal_items(saved_meal_id,food_id,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g)
select m.id,f.id,'Oats snapshot',2,40,'g',150,5,27,3 from public.saved_meals m cross join public.foods f;
select is((select count(*)::int from public.log_saved_meal((select id from public.saved_meals),'lunch','2026-08-31T12:00:00+08')),1,'Saved meal logs all items atomically');
select is((select calories::int from public.food_logs where meal_type='lunch'),300,'Saved meal servings scale snapshots');
select set_config('app.test_saved_meal_id',(select id::text from public.saved_meals),true);

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select is((select count(*)::int from public.foods),0,'B cannot read A food');
select is((select count(*)::int from public.food_logs),0,'B cannot read A food logs');
select is((select count(*)::int from public.water_logs),0,'B cannot read A water logs');
select is((select count(*)::int from public.saved_meals),0,'B cannot read A saved meal');
select is((select count(*)::int from public.saved_meal_items),0,'B cannot read A saved meal items');
update public.food_logs set calories=1 where user_id='11111111-1111-4111-8111-111111111111';
select is((select count(*)::int from public.food_logs),0,'B cannot update A logs');
delete from public.water_logs where user_id='11111111-1111-4111-8111-111111111111';
select is((select count(*)::int from public.water_logs),0,'B cannot delete A water');
select throws_ok($$insert into public.food_logs(user_id,meal_type,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g) values('11111111-1111-4111-8111-111111111111','snack','Forbidden',1,1,'serving',1,0,0,0)$$,'42501',null,'B cannot insert A log');
select throws_ok(format($$select * from public.log_saved_meal(%L,'dinner',now())$$,current_setting('app.test_saved_meal_id')),'P0002','Saved meal not found','B cannot log A saved meal');

select * from finish();
rollback;
