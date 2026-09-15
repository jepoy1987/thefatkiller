"""Real local Auth + private Storage deletion. Only disposable identities."""
import subprocess,json,urllib.request,uuid,secrets
s=json.loads(subprocess.check_output(['node_modules/.bin/supabase','status','--output','json'],text=True,stderr=subprocess.DEVNULL))
assert s['API_URL'].startswith(('http://127.0.0.1:','http://localhost:'))
def http(path,body=None,token=None,method='POST',binary=False):
 headers={'apikey':s['ANON_KEY'] if token else s['SERVICE_ROLE_KEY'],'Authorization':'Bearer '+(token or s['SERVICE_ROLE_KEY']),'Content-Type':'image/jpeg' if binary else 'application/json'}
 r=urllib.request.urlopen(urllib.request.Request(s['API_URL']+path,data=body if binary else json.dumps(body).encode() if body is not None else None,headers=headers,method=method),timeout=20)
 raw=r.read();return json.loads(raw) if raw else None
def sql(q):
 r=subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True)
 if r.returncode: raise RuntimeError(r.stderr)
 return r.stdout.strip()
users=[];paths=[]
try:
 tokens=[]
 for _ in range(2):
  email=f'delete-{uuid.uuid4()}@local.test';password=secrets.token_urlsafe(24)
  u=http('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True})['id'];users.append(u)
  tokens.append(http('/auth/v1/token?grant_type=password',{'email':email,'password':password})['access_token'])
 image=subprocess.check_output(['node','-e',"require('./apps/web/node_modules/sharp')({create:{width:20,height:20,channels:3,background:'white'}}).jpeg().toBuffer().then(b=>process.stdout.write(b))"])
 for u in users:
  for bucket in ['progress-photos','food-analysis']:
   path=f'{u}/{uuid.uuid4()}.jpg';paths.append((bucket,path));http('/storage/v1/object/'+bucket+'/'+path,image,binary=True)
  sql(f"insert into public.water_logs(user_id,amount_ml) values('{u}',250);")
 try:http('/rest/v1/rpc/request_account_deletion',{'p_confirmation':'wrong'},tokens[0]);raise AssertionError('Missing confirmation accepted')
 except urllib.error.HTTPError as e:assert e.code==400
 assert http('/rest/v1/rpc/request_account_deletion',{'p_confirmation':'DELETE MY ACCOUNT'},tokens[0]) is True
 assert http('/rest/v1/rpc/request_account_deletion',{'p_confirmation':'DELETE MY ACCOUNT'},tokens[0]) is True
 assert sql(f"select count(*) from private.account_deletions where user_id='{users[0]}';")=='1'
 try:http('/rest/v1/water_logs',{'user_id':users[0],'amount_ml':250},tokens[0]);raise AssertionError('Queued owner can write')
 except urllib.error.HTTPError as e:assert e.code in (401,403)
 assert sql(f"select count(*) from auth.sessions where user_id='{users[0]}';")=='0'
 # Disposable clock advance; real worker still enforces ready_at in ordinary use.
 sql(f"update private.account_deletions set ready_at=clock_timestamp()-interval '1 second' where user_id='{users[0]}';")
 out=subprocess.run(['node','--experimental-strip-types','scripts/delete-accounts.mjs','--local'],capture_output=True,text=True)
 assert out.returncode==0,out.stderr
 result=json.loads(out.stdout);assert result['completed']==1,result
 assert sql(f"select count(*) from auth.users where id='{users[0]}';")=='0'
 assert sql(f"select count(*) from public.water_logs where user_id='{users[0]}';")=='0'
 assert sql(f"select count(*) from storage.objects where split_part(name,'/',1)='{users[0]}';")=='0'
 assert sql(f"select count(*) from storage.objects where split_part(name,'/',1)='{users[1]}';")=='2'
 assert sql(f"select count(*) from public.water_logs where user_id='{users[1]}';")=='1'
 out=subprocess.run(['node','--experimental-strip-types','scripts/delete-accounts.mjs','--local'],capture_output=True,text=True)
 assert json.loads(out.stdout)['examined']==0
 print('Account deletion local E2E: 12/12 passed (confirmation, repeated request, write freeze, session revocation, real Storage/Auth removal, other-owner isolation, rerun)')
finally:
 for bucket,path in paths:
  http('/storage/v1/object/'+bucket,{'prefixes':[path]},method='DELETE')
 for u in users:sql(f"delete from auth.users where id='{u}';")
