"""Disposable local logical DB export and private object byte recovery rehearsal."""
import subprocess,json,uuid,urllib.request,tempfile,pathlib,hashlib
s=json.loads(subprocess.check_output(['node_modules/.bin/supabase','status','--output','json'],text=True,stderr=subprocess.DEVNULL));assert s['API_URL'].startswith(('http://127.0.0.1:','http://localhost:'))
u=str(uuid.uuid4());schema='restore_'+uuid.uuid4().hex;path=u+'/'+str(uuid.uuid4())+'.jpg'
def sql(q):
 r=subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True)
 assert r.returncode==0,r.stderr;return r.stdout.strip()
def request(route,body=None,method='GET',mime='application/json'):
 return urllib.request.urlopen(urllib.request.Request(s['API_URL']+route,data=body,method=method,headers={'apikey':s['SERVICE_ROLE_KEY'],'Authorization':'Bearer '+s['SERVICE_ROLE_KEY'],'Content-Type':mime}),timeout=20).read()
try:
 sql(f"insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values('{u}','authenticated','authenticated','restore-{u}@local.test','{{}}','{{}}');create schema {schema};create table {schema}.entries(id uuid primary key,amount integer not null);insert into {schema}.entries values('{u}',250);")
 image=subprocess.check_output(['node','-e',"require('./apps/web/node_modules/sharp')({create:{width:20,height:20,channels:3,background:'white'}}).jpeg().toBuffer().then(b=>process.stdout.write(b))"])
 request('/storage/v1/object/progress-photos/'+path,image,'POST','image/jpeg')
 with tempfile.TemporaryDirectory(prefix='tfk-restore-') as temp:
  db=pathlib.Path(temp)/'db.sql';photo=pathlib.Path(temp)/'object.jpg'
  dump=subprocess.run(['docker','exec','supabase_db_tfk','pg_dump','-U','postgres','-d','postgres','--schema',schema,'--no-owner','--no-privileges'],capture_output=True,check=True).stdout
  db.write_bytes(dump);photo.write_bytes(request('/storage/v1/object/progress-photos/'+path))
  digest=hashlib.sha256(photo.read_bytes()).hexdigest()
  sql(f'drop schema {schema} cascade;');request('/storage/v1/object/progress-photos',json.dumps({'prefixes':[path]}).encode(),'DELETE')
  assert sql(f"select count(*) from pg_namespace where nspname='{schema}';")=='0'
  assert sql(f"select count(*) from storage.objects where name='{path}';")=='0'
  sql(db.read_text());request('/storage/v1/object/progress-photos/'+path,photo.read_bytes(),'POST','image/jpeg')
  assert sql(f'select amount from {schema}.entries;')=='250'
  assert hashlib.sha256(request('/storage/v1/object/progress-photos/'+path)).hexdigest()==digest
  print('Restore rehearsal: 4/4 passed (DB export, destructive disposable change, DB recovery, separate private object checksum recovery). Logical local rehearsal; not cloud PITR/full Auth disaster recovery.')
finally:
 request('/storage/v1/object/progress-photos',json.dumps({'prefixes':[path]}).encode(),'DELETE')
 sql(f'drop schema if exists {schema} cascade;delete from auth.users where id=\'{u}\';')
