"""Local-only transactional replay tests, including real simultaneous DB requests."""
import concurrent.futures, json, subprocess, time, uuid
users=[str(uuid.uuid4()),str(uuid.uuid4())]
def sql(q):
 return subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],input=q,text=True,capture_output=True,timeout=30)
def call(owner,key,payload=None):
 payload=payload or {'amount_ml':250,'logged_at':'2026-09-15T00:00:00Z'}
 return sql(f"begin;set local role authenticated;select set_config('request.jwt.claim.sub','{owner}',true);select public.replay_safe_mutation('{key}','water_log','{json.dumps(payload)}');commit;")
def key(offset=0): return f'{int(time.time()*1000)+offset}:{uuid.uuid4()}'
try:
 for u in users:
  assert sql(f"insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values('{u}','authenticated','authenticated','replay-{u}@local.test','{{}}','{{}}');").returncode==0
 k=key()
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: rows=list(pool.map(lambda _:call(users[0],k),range(24)))
 assert all(r.returncode==0 for r in rows),[r.stderr for r in rows if r.returncode]
 assert sql(f"select count(*) from public.water_logs where user_id='{users[0]}';").stdout.strip()=='1'
 assert len(set(r.stdout for r in rows))==1
 assert call(users[0],k).stdout==rows[0].stdout # Lost-response retry
 assert call(users[0],key()).returncode==0 # Separate legitimate operation
 assert call(users[1],k).returncode==0 # Same external key cannot reuse A's receipt
 r=call(users[0],k,{'amount_ml':500,'logged_at':'2026-09-15T00:00:00Z'})
 assert r.returncode and 'different entry' in r.stderr
 r=call(users[0],key(-8*86400000));assert r.returncode and 'expired' in r.stderr
 r=call(users[0],key(),{'amount_ml':-1,'logged_at':'2026-09-15T00:00:00Z'});assert r.returncode
 assert sql(f"select count(*) from private.mutation_receipts where user_id='{users[0]}';").stdout.strip()=='2'
 r=call(users[0],key(),{'amount_ml':250,'logged_at':'2026-09-15T00:00:00Z','user_id':users[1]});assert r.returncode and 'Invalid fields' in r.stderr
 assert sql(f"select count(*) from public.water_logs where user_id='{users[1]}';").stdout.strip()=='1'
 print('Mutation replay: 10/10 passed; 24 simultaneous same-key requests produce one result')
finally:
 for u in users: assert sql(f"delete from auth.users where id='{u}';").returncode==0
