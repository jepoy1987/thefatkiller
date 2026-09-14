"""Local-only real Storage deletion/retention regression; all fixtures cleaned up."""
import json,subprocess,uuid,urllib.request,urllib.error
s=json.loads(subprocess.check_output(['node_modules/.bin/supabase','status','--output','json'],text=True,stderr=subprocess.DEVNULL));url=s['API_URL'];key=s['SERVICE_ROLE_KEY']
assert url.startswith(('http://127.0.0.1:','http://localhost:'))
def sql(q):return subprocess.check_output(['docker','exec','supabase_db_tfk','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atc',q],text=True).strip()
def req(path,body=None,method='POST',mime='application/json'):
 data=None if body is None else body if isinstance(body,bytes) else json.dumps(body).encode()
 try:
  r=urllib.request.urlopen(urllib.request.Request(url+path,data=data,method=method,headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':mime}),timeout=15);return r.status,r.read()
 except urllib.error.HTTPError as e:return e.code,b''
u=str(uuid.uuid4());ids=[str(uuid.uuid4()) for _ in range(4)];paths=[f'{u}/{a}-1.jpg' for a in ids];checks=0
try:
 sql(f"insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values('{u}','authenticated','authenticated','retention-{u}@local.test','{{}}','{{}}');")
 for i,a in enumerate(ids):
  status=['pending','failed','pending','confirmed'][i];expiry="now()+interval '1 day'" if i==3 else "now()-interval '1 day'"
  sql(f"insert into public.food_photo_analyses(id,user_id,status,expires_at,storage_path) values('{a}','{u}','{status}',{expiry},'{paths[i]}');")
 image=subprocess.check_output(['node','-e',"require('./apps/web/node_modules/sharp')({create:{width:100,height:100,channels:3,background:'white'}}).jpeg().toBuffer().then(b=>process.stdout.write(b))"])
 for i in [0,1,3]:assert req('/storage/v1/object/food-analysis/'+paths[i],image,mime='image/jpeg')[0]==200
 code,data=req('/rest/v1/rpc/claim_food_photo_cleanup',{'p_limit':1});assert code==200 and len(json.loads(data))==1;checks+=1
 sql(f"update public.food_photo_analyses set cleanup_lease_until=now()-interval '1 minute' where user_id='{u}';")
 subprocess.run(['node','scripts/cleanup-food-photos.mjs','--local'],capture_output=True,check=True)
 for i in [0,1]:
  assert req('/storage/v1/object/food-analysis/'+paths[i],method='GET')[0]>=400
  assert sql(f"select status from public.food_photo_analyses where id='{ids[i]}';")=='expired';checks+=1
 assert sql(f"select status from public.food_photo_analyses where id='{ids[2]}';")=='expired';checks+=1
 assert req('/storage/v1/object/food-analysis/'+paths[3],method='GET')[0]==200
 assert sql(f"select status from public.food_photo_analyses where id='{ids[3]}';")=='confirmed';checks+=1
 out=subprocess.check_output(['node','scripts/cleanup-food-photos.mjs','--local'],text=True);assert json.loads(out)['examined']==0;checks+=1
 bad=subprocess.run(['docker','exec','supabase_db_tfk','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',f"update public.food_photo_analyses set storage_path='other/{ids[3]}-1.jpg' where id='{ids[3]}';"],capture_output=True);assert bad.returncode!=0;checks+=1
 assert req('/storage/v1/object/food-analysis/'+paths[3],method='GET')[0]==200;checks+=1
 print(f'Retention real Storage tests: {checks}/8 passed')
finally:
 req('/storage/v1/object/food-analysis',{'prefixes':paths},'DELETE');sql(f"delete from auth.users where id='{u}';")
