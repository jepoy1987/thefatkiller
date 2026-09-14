"""Real local Storage API tests. No remote endpoint option; fixtures always removed."""
import subprocess,json,urllib.request,urllib.error,uuid,time,secrets
s=json.loads(subprocess.check_output(['node_modules/.bin/supabase','status','--output','json'],text=True,stderr=subprocess.DEVNULL));base=s['API_URL'];admin=s['SERVICE_ROLE_KEY'];anon=s['ANON_KEY'];u={'id':str(uuid.uuid4()),'password':secrets.token_urlsafe(24)};other={'id':str(uuid.uuid4()),'password':secrets.token_urlsafe(24)}
for x in [u,other]:x['email']='storage-qa-'+x['id']+'@local.test'
aid=str(uuid.uuid4());path=None;checks=0
def req(path,token,body=None,method='POST',mime='application/json'):
 data=None if body is None else (json.dumps(body).encode() if isinstance(body,(dict,list)) else body)
 try:
  r=urllib.request.urlopen(urllib.request.Request(base+path,data=data,method=method,headers={'Authorization':'Bearer '+token,'apikey':anon,'Content-Type':mime}),timeout=20);raw=r.read();return r.status,json.loads(raw) if raw else None
 except urllib.error.HTTPError as e:
  try:payload=json.loads(e.read());return e.code,{'code':payload.get('error_code'), 'message':payload.get('msg')}
  except (ValueError,UnicodeDecodeError):return e.code,None
 except (json.JSONDecodeError,UnicodeDecodeError):return r.status,raw
try:
 for x in [u,other]:
  setup=f"insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change_token_new,email_change,created_at,updated_at) values('00000000-0000-0000-0000-000000000000','{x['id']}','authenticated','authenticated','{x['email']}',extensions.crypt('{x['password']}',extensions.gen_salt('bf')),now(),'{{}}','{{}}','','','','',now(),now());insert into public.user_subscriptions(user_id,plan_id,status,provider) select '{x['id']}',id,'active','internal' from public.plans where code='premium';"
  subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],input=setup,text=True,capture_output=True,check=True)
 tokens={}
 for role,x in [('owner',u),('other',other)]:
  status,r=req('/auth/v1/token?grant_type=password',anon,{'email':x['email'],'password':x['password']});assert status==200,(status,r);tokens[role]=r['access_token']
 status,r=req('/rest/v1/rpc/claim_food_photo',admin,{'p_id':aid,'p_user_id':u['id'],'p_retry':False});assert status==200;path=r['analysis']['storage_path']
 image=subprocess.check_output(['node','-e',"require('./apps/web/node_modules/sharp')({create:{width:100,height:100,channels:3,background:'white'}}).jpeg().toBuffer().then(b=>process.stdout.write(b))"])
 status,_=req('/storage/v1/object/food-analysis/'+path,admin,image,mime='image/jpeg');assert status==200;checks+=1
 status,_=req('/storage/v1/object/sign/food-analysis/'+path,tokens['other'],{'expiresIn':1});assert status>=400;checks+=1
 status,r=req('/storage/v1/object/sign/food-analysis/'+path,tokens['owner'],{'expiresIn':1});assert status==200;checks+=1
 signed=r['signedURL'];status,_=req('/storage/v1'+signed,anon,method='GET');assert status==200;time.sleep(2);status,_=req('/storage/v1'+signed,anon,method='GET');assert status>=400;checks+=1
 status,_=req('/storage/v1/object/public/food-analysis/'+path,anon,method='GET');assert status>=400;checks+=1
 status,_=req('/storage/v1/object/food-analysis/'+path+'.txt',admin,b'no',mime='text/plain');assert status>=400;checks+=1
 status,_=req('/storage/v1/object/food-analysis/'+path+'.jpg',admin,b'x'*(3*1024*1024+1),mime='image/jpeg');assert status>=400;checks+=1
 status,_=req('/storage/v1/object/food-analysis/'+other['id']+'/forged.jpg',tokens['owner'],image,mime='image/jpeg');assert status>=400;checks+=1
 sql=f"update public.food_photo_analyses set expires_at=clock_timestamp()-interval '1 second' where id='{aid}';"
 subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres'],input=sql,text=True,capture_output=True,check=True)
 status,_=req('/storage/v1/object/sign/food-analysis/'+path,tokens['owner'],{'expiresIn':1});assert status>=400;checks+=1
 subprocess.run(['node','scripts/cleanup-food-photos.mjs','--local'],check=True,capture_output=True)
 status,_=req('/storage/v1/object/food-analysis/'+path,admin,method='GET');assert status>=400;checks+=1
 print(f'Local real Storage API checks: {checks}/10 passed')
finally:
 if path:req('/storage/v1/object/food-analysis',admin,{'prefixes':[path]},method='DELETE')
 subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres'],input=f"delete from auth.users where id in ('{u['id']}','{other['id']}');",text=True,capture_output=True,check=True)
