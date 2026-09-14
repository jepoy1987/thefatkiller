"""Local-only committed-fixture concurrency verification; always cleans up."""
import concurrent.futures,json,subprocess,uuid
base=['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At']
def sql(statement):
 p=subprocess.run(base,input=statement,text=True,capture_output=True,timeout=20)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout.strip()
u=str(uuid.uuid4());analysis=str(uuid.uuid4());checks=0
try:
 sql(f"insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values('{u}','authenticated','authenticated','photo-race-{u}@local.test','{{}}','{{}}');insert into public.user_subscriptions(user_id,plan_id,status,provider) select '{u}',id,'active','internal' from public.plans where code='premium';")
 def claim(i):return json.loads(sql(f"select public.claim_food_photo('{i}','{u}');"))
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:r=list(pool.map(lambda _:claim(analysis),range(4)))
 assert sum(x['claimed'] for x in r)==1;checks+=1
 item={'name':'QA','estimated_portion':{'amount':1,'unit':'serving'},'estimated_calories':100,'protein_g':10,'carbs_g':10,'fat_g':2,'confidence':0.5}
 result={'items':[item],'meal_totals':{'calories':100,'protein_g':10,'carbs_g':10,'fat_g':2},'uncertainties':['QA fixture.']}
 sql(f"select public.finish_food_photo('{analysis}','{u}',1,'{json.dumps(result)}','mock','fixture','',true);")
 def confirm(_):return sql(f"begin;set local role authenticated;select set_config('request.jwt.claim.sub','{u}',true);select public.confirm_food_photo('{analysis}','{json.dumps([item])}','lunch',now());commit;")
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(confirm,range(4)))
 assert sql(f"select count(*) from public.food_logs where user_id='{u}';")=='1';checks+=1
 def limited(_):
  try:return claim(str(uuid.uuid4()))['claimed']
  except RuntimeError as e:
   if 'Daily analysis limit reached' not in str(e):raise
   return False
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:r=list(pool.map(limited,range(15)))
 assert sum(r)==9;assert sql(f"select sum(attempts) from public.food_photo_analyses where user_id='{u}';")=='10';checks+=1
 print(f'Food-photo concurrency: {checks}/3 passed')
finally:
 sql(f"delete from auth.users where id='{u}';")
 print('Remaining local QA users:',sql(f"select count(*) from auth.users where id='{u}';"))
