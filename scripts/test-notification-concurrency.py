"""Local Docker integration tests. Committed fixtures are removed in tearDown.

Run after supabase db reset: python3 scripts/test-notification-concurrency.py
Never points at a linked/staging database. No credentials or network DB URL accepted.
"""
import concurrent.futures
import json
import subprocess
import time
import unittest
import uuid

PSQL = ['docker', 'exec', '-i', 'supabase_db_tfk', 'psql', '-U', 'postgres',
        '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At']


def sql(statement):
    result = subprocess.run(PSQL, input=statement, text=True, capture_output=True, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


class Transaction:
    def __init__(self, statement='begin;'):
        self.process = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE, text=True, bufsize=1)
        self.process.stdin.write(statement + "select 'READY';\n")
        self.process.stdin.flush()
        while True:
            line = self.process.stdout.readline()
            if line.strip() == 'READY':
                break
            if not line:
                raise RuntimeError('Transaction failed to start')

    def finish(self, statement='commit;'):
        out, err = self.process.communicate(statement + '\n', timeout=20)
        if self.process.returncode:
            raise RuntimeError(err)
        return out

    def close(self):
        if self.process.poll() is None:
            self.finish('rollback;')


class NotificationConcurrency(unittest.TestCase):
    def setUp(self):
        self.user = str(uuid.uuid4())
        self.transactions = []
        sql(f"""insert into auth.users(instance_id,id,aud,role,email,encrypted_password,
          email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values('00000000-0000-0000-0000-000000000000','{self.user}','authenticated',
          'authenticated','concurrency-{self.user}@local.test','',now(),'{{}}','{{}}',now(),now());
          update public.profiles set timezone='UTC' where id='{self.user}';
          insert into public.user_subscriptions(user_id,plan_id,status,provider)
          select '{self.user}',id,'active','internal' from public.plans where code='premium';
          insert into public.reminder_preferences(user_id,daily_check_in_enabled,daily_check_in_time,
          weekly_check_in_enabled,habit_reminders_enabled,workout_reminders_enabled)
          values('{self.user}',false,'00:00',false,false,true);
          with t as(insert into public.workout_templates(owner_user_id,name)
          values('{self.user}','Concurrency QA') returning id)
          insert into public.workout_assignments(client_user_id,workout_template_id,due_at)
          select '{self.user}',id,clock_timestamp()+interval '10 minutes' from t cross join generate_series(1,25);
        """)

    def tearDown(self):
        for transaction in self.transactions:
            transaction.close()
        sql(f"""delete from public.workout_assignments where client_user_id='{self.user}';
          delete from public.workout_templates where owner_user_id='{self.user}';
          delete from auth.users where id='{self.user}';""")
        self.assertEqual(sql(f"select count(*) from auth.users where id='{self.user}';"), '0')

    def transaction(self, statement='begin;'):
        transaction = Transaction(statement)
        self.transactions.append(transaction)
        return transaction

    def generate(self):
        return json.loads(sql(f"select private.generate_user_reminders('{self.user}',null);"))

    def count(self):
        return int(sql(f"select count(*) from public.notifications where user_id='{self.user}' and created_at>clock_timestamp()-interval '24 hours';"))

    def test_sequential_exactly_twenty_and_twenty_first_suppressed(self):
        self.assertEqual(self.generate()['inserted'], 20)
        self.assertEqual(self.generate()['inserted'], 0)
        self.assertEqual(self.count(), 20)

    def test_concurrent_private_workers_are_capped_and_idempotent(self):
        # Same per-user lock as the public/cron path; many simultaneous candidates.
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: self.generate(), range(4)))
        self.assertEqual(sum(r['inserted'] for r in results), 20)
        self.assertEqual(self.count(), 20)
        self.assertEqual(sql(f"select count(*)=count(distinct dedupe_key) from public.notifications where user_id='{self.user}';"), 't')

    def test_older_transaction_resumes_after_newer_public_worker(self):
        older = self.transaction()
        sql('select public.generate_due_notifications();')
        self.assertEqual(self.count(), 20)
        sql(f"update public.reminder_preferences set daily_check_in_enabled=true where user_id='{self.user}';")
        result = older.finish('select public.generate_due_notifications();commit;')
        self.assertIn('"errors": 0', result)
        self.assertEqual(self.count(), 20)

    def test_row_lock_waiter_sees_committed_quota(self):
        holder = self.transaction(f"begin;select private.generate_user_reminders('{self.user}',null);")
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            name = 'cap-wait-' + self.user
            waiter = pool.submit(sql, f"set application_name='{name}';select private.generate_user_reminders('{self.user}',null);")
            try:
                deadline = time.monotonic() + 5
                while sql(f"select count(*) from pg_stat_activity where application_name='{name}' and wait_event_type='Lock';") != '1':
                    if time.monotonic() >= deadline:
                        self.fail('Second connection did not block on the per-user lock')
                    time.sleep(0.02)
            finally:
                holder.finish()
            self.assertEqual(json.loads(waiter.result().splitlines()[-1])['inserted'], 0)
        self.assertEqual(self.count(), 20)

    def test_manual_and_cron_entrypoint_overlap(self):
        # Execute the exact cron SQL while retaining its transaction-level lock.
        cron = self.transaction('begin;select public.generate_due_notifications();')
        self.assertEqual(json.loads(sql('select public.generate_due_notifications();')), {'busy': True})
        cron.finish()
        sql('select public.generate_due_notifications();')
        self.assertEqual(self.count(), 20)

    def test_timezone_and_injected_time_cannot_reset_cap(self):
        self.generate()
        sql(f"update public.profiles set timezone='Pacific/Kiritimati' where id='{self.user}';")
        sql(f"update public.reminder_preferences set daily_check_in_enabled=true where user_id='{self.user}';")
        result = json.loads(sql(f"select private.generate_user_reminders('{self.user}',clock_timestamp()+interval '1 day');"))
        self.assertEqual(result['inserted'], 0)
        self.assertGreater(result['capped'], 0)
        self.assertEqual(self.count(), 20)

    def test_fixed_snapshots_fail_closed(self):
        for isolation in ('repeatable read', 'serializable'):
            with self.assertRaisesRegex(RuntimeError, 'requires READ COMMITTED'):
                sql(f"begin isolation level {isolation};select private.generate_user_reminders('{self.user}',null);commit;")
        self.assertEqual(self.count(), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
