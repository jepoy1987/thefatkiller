"""Local-only disposable DB + private Storage recovery; never a cloud restore."""
import hashlib
import json
import pathlib
import subprocess
import tempfile
import time
import urllib.request
import uuid

started = time.monotonic()
s = json.loads(subprocess.check_output(
    ['node_modules/.bin/supabase', 'status', '--output', 'json'],
    text=True, stderr=subprocess.DEVNULL))
assert s['API_URL'].startswith(('http://127.0.0.1:', 'http://localhost:'))
owner = str(uuid.uuid4())
schema = 'restore_' + uuid.uuid4().hex
photo_id, analysis_id, expired_id = [str(uuid.uuid4()) for _ in range(3)]
paths = [('progress-photos', owner + '/' + photo_id + '.jpg'),
         ('food-analysis', owner + '/' + analysis_id + '-1.jpg'),
         ('food-analysis', owner + '/' + expired_id + '-1.jpg')]
checks = 0


def sql(query):
    result = subprocess.run(
        ['docker', 'exec', '-i', 'supabase_db_tfk', 'psql', '-U', 'postgres',
         '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'],
        input=query, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('Local rehearsal SQL failed; no sensitive SQL logged')
    return result.stdout.strip()


def request(route, body=None, method='GET', mime='application/json'):
    return urllib.request.urlopen(urllib.request.Request(
        s['API_URL'] + '/storage/v1/' + route, data=body, method=method,
        headers={'apikey': s['SERVICE_ROLE_KEY'],
                 'Authorization': 'Bearer ' + s['SERVICE_ROLE_KEY'],
                 'Content-Type': mime}), timeout=20).read()


def check(condition):
    global checks
    assert condition, 'Restore invariant failed'
    checks += 1


try:
    sql(f"""insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
      values('{owner}','authenticated','authenticated','restore-{owner}@local.test','{{}}','{{}}');
      create schema {schema};
      create table {schema}.entries(id uuid primary key references auth.users(id),amount integer not null);
      insert into {schema}.entries values('{owner}',250);
      insert into public.progress_photos(id,user_id,storage_path)
        values('{photo_id}','{owner}','{paths[0][1]}');
      insert into public.food_photo_analyses(id,user_id,storage_path,expires_at) values
        ('{analysis_id}','{owner}','{paths[1][1]}',clock_timestamp()+interval '1 hour'),
        ('{expired_id}','{owner}','{paths[2][1]}',clock_timestamp()-interval '1 hour');""")
    image = subprocess.check_output(['node', '-e',
        "require('./apps/web/node_modules/sharp')({create:{width:20,height:20,channels:3,background:'white'}}).jpeg().toBuffer().then(b=>process.stdout.write(b))"])
    for bucket, path in paths:
        request('object/' + bucket + '/' + path, image, 'POST', 'image/jpeg')
    with tempfile.TemporaryDirectory(prefix='tfk-restore-') as temp:
        root = pathlib.Path(temp)
        dump = subprocess.check_output(['docker', 'exec', 'supabase_db_tfk', 'pg_dump',
            '-U', 'postgres', '-d', 'postgres', '--schema', schema, '--no-owner', '--no-privileges'])
        (root / 'db.sql').write_bytes(dump)
        # Export real application rows, restricted to the disposable owner.
        records = {table: json.loads(sql(f"select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.{table} t where user_id='{owner}';"))
                   for table in ('progress_photos', 'food_photo_analyses')}
        (root / 'rows.json').write_text(json.dumps(records))
        eligible = json.loads(sql(f"""select jsonb_agg(t) from (
          select 'progress-photos' as bucket,storage_path as path,user_id,null::timestamptz as expires_at
          from public.progress_photos where user_id='{owner}'
          union all select 'food-analysis',storage_path,user_id,expires_at
          from public.food_photo_analyses where user_id='{owner}' and expires_at>clock_timestamp()
            and status in ('pending','failed') and storage_path is not null) t;"""))
        check(len(eligible) == 2 and all(row['path'] != paths[2][1] for row in eligible))
        manifest = []
        for index, row in enumerate(eligible):
            content = request('object/' + row['bucket'] + '/' + row['path'])
            metadata = json.loads(sql(f"select to_jsonb(o) from storage.objects o where bucket_id='{row['bucket']}' and name='{row['path']}';"))
            row.update(file=f'{index}.jpg', sha256=hashlib.sha256(content).hexdigest(),
                       size=len(content), content_type='image/jpeg', storage_metadata=metadata)
            (root / row['file']).write_bytes(content)
            manifest.append(row)
        (root / 'manifest.json').write_text(json.dumps(manifest))
        check(all(row['path'].split('/')[0] == owner and row['user_id'] == owner for row in manifest))
        sql(f"drop schema {schema} cascade;delete from public.progress_photos where user_id='{owner}';delete from public.food_photo_analyses where id='{analysis_id}';")
        for row in manifest:
            request('object/' + row['bucket'], json.dumps({'prefixes':[row['path']]}).encode(), 'DELETE')
        check(sql(f"select count(*) from pg_namespace where nspname='{schema}';") == '0')
        check(sql(f"select count(*) from storage.objects where name in ('{paths[0][1]}','{paths[1][1]}');") == '0')
        sql((root / 'db.sql').read_text())
        for table, rows in json.loads((root / 'rows.json').read_text()).items():
            for row in rows:
                if row['id'] == expired_id:
                    continue  # Never resurrect the expired photo or its metadata.
                encoded = json.dumps(row).replace("'", "''")
                sql(f"insert into public.{table} select * from jsonb_populate_record(null::public.{table},'{encoded}'::jsonb);")
        check(sql(f'select amount from {schema}.entries;') == '250')
        check(sql(f"select count(*) from public.progress_photos p join auth.users u on u.id=p.user_id where p.id='{photo_id}' and p.user_id='{owner}';") == '1')
        check(sql(f"select count(*) from public.food_photo_analyses where id='{analysis_id}' and user_id='{owner}' and storage_path='{paths[1][1]}' and expires_at>clock_timestamp();") == '1')
        for row in json.loads((root / 'manifest.json').read_text()):
            content = (root / row['file']).read_bytes()
            check(len(content) == row['size'] and hashlib.sha256(content).hexdigest() == row['sha256'])
            request('object/' + row['bucket'] + '/' + row['path'], content, 'POST', row['content_type'])
            check(hashlib.sha256(request('object/' + row['bucket'] + '/' + row['path'])).hexdigest() == row['sha256'])
        check(request('object/' + paths[2][0] + '/' + paths[2][1]) == image)
        check(sql(f"select count(*) from storage.buckets where id in ('progress-photos','food-analysis') and public=false;") == '2')
finally:
    # Storage API owns byte deletion; never delete storage.objects directly.
    for bucket, path in paths:
        request('object/' + bucket, json.dumps({'prefixes':[path]}).encode(), 'DELETE')
    sql(f"drop schema if exists {schema} cascade;delete from auth.users where id='{owner}';")
check(sql(f"select count(*) from auth.users where id='{owner}';") == '0')
check(sql(f"select count(*) from storage.objects where name like '{owner}/%';") == '0')
print(f'Restore rehearsal: {checks}/{checks} passed; elapsed {time.monotonic()-started:.2f}s. '
      'Both private buckets, manifests/checksums, application FK/owner paths, expired exclusion and residue verified. '
      'Not cloud restore or full Auth recovery.')
