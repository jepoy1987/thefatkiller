"""Local-only reservation races: fixed hard slot budget under concurrent uploads."""
import concurrent.futures,subprocess,uuid
u=str(uuid.uuid4())
def sql(q):return subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True)
try:
 assert sql(f"insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values('{u}','authenticated','authenticated','quota-{u}@local.test','{{}}','{{}}');").returncode==0
 def reserve(_):
  r=sql(f"begin;set local role authenticated;select set_config('request.jwt.claim.sub','{u}',true);select public.reserve_progress_upload('{u}/{uuid.uuid4()}.jpg');commit;")
  if r.returncode:assert 'Storage allowance reached' in r.stderr,r.stderr
  return r.returncode==0
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(reserve,range(65)))
 assert sum(results)==50
 assert sql(f"select count(*) from private.storage_reservations where user_id='{u}';").stdout.strip()=='50'
 print('Storage quota concurrency: 2/2 passed; 65 concurrent reservations allow exactly 50')
finally:assert sql(f"delete from auth.users where id='{u}';").returncode==0
