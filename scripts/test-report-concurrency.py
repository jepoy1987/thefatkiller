"""Local-only report quota concurrency. Synthetic user removed in finally."""
import concurrent.futures, subprocess, uuid
uid=str(uuid.uuid4())
def sql(q):
    return subprocess.run(['docker','exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],input=q,text=True,capture_output=True,timeout=30)
try:
    assert sql(f"insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values('{uid}','authenticated','authenticated','report-race-{uid}@local.test','{{}}','{{}}');").returncode==0
    def claim(_):
        r=sql(f"begin;select set_config('request.jwt.claim.sub','{uid}',true);select private.claim_report_read();commit;")
        if r.returncode: assert 'Report rate limit reached' in r.stderr
        return r.returncode==0
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(claim,range(40)))
    assert sum(results)==30
    assert sql(f"select cardinality(calls) from private.report_read_limits where user_id='{uid}';").stdout.strip()=='30'
    r=sql(f"begin isolation level repeatable read;select set_config('request.jwt.claim.sub','{uid}',true);select private.claim_report_read();commit;")
    assert r.returncode and 'Quota unavailable' in r.stderr
    print('Report quota: 3/3 passed (40 concurrent claims, bounded storage, fixed snapshot fails closed)')
finally:
    assert sql(f"delete from auth.users where id='{uid}';").returncode==0
