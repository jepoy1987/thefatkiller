#!/usr/bin/env python3
"""Real two-session checks for messaging relationship locks. Local Supabase only."""

from __future__ import annotations

import os
import re
import selectors
import subprocess
import time


CONTAINER = os.environ.get("SUPABASE_DB_CONTAINER", "supabase_db_tfk")
PSQL = ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"]


def sql(statement: str, *, succeeds: bool = True, timeout: float = 20) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(PSQL, input=statement, text=True, capture_output=True, timeout=timeout)
    if succeeds and result.returncode:
        raise AssertionError(result.stderr or result.stdout)
    if not succeeds and result.returncode == 0:
        raise AssertionError("statement unexpectedly succeeded")
    return result


def start_holder(actor: str, statement: str) -> subprocess.Popen[str]:
    process = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    assert process.stdin and process.stdout and process.stderr
    process.stdin.write(
        "begin; set local role authenticated; "
        f"select set_config('request.jwt.claim.sub','{actor}',true); "
        f"{statement};\n"
    )
    process.stdin.flush()
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    selector.register(process.stderr, selectors.EVENT_READ)
    deadline = time.monotonic() + 10
    transcript: list[str] = []
    while time.monotonic() < deadline:
        for key, _ in selector.select(timeout=0.25):
            line = key.fileobj.readline()
            if line:
                transcript.append(line)
                value = line.strip()
                if value != actor and re.fullmatch(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", value, re.IGNORECASE):
                    return process
        if process.poll() is not None:
            break
    process.kill()
    raise AssertionError("lock holder did not start: " + "".join(transcript))


def commit_holder(process: subprocess.Popen[str]) -> None:
    assert process.stdin
    process.stdin.write("commit; select 'COMMITTED';\n\\q\n")
    process.stdin.flush()
    stdout, stderr = process.communicate(timeout=10)
    if process.returncode or "COMMITTED" not in stdout:
        raise AssertionError(stderr or stdout)


def assert_relationship_update_blocks(statement: str) -> None:
    result = sql("set lock_timeout='400ms'; " + statement, succeeds=False)
    if "lock timeout" not in result.stderr.lower():
        raise AssertionError(result.stderr or result.stdout)


USERS = [
    "f1111111-1111-4111-8111-111111111111",
    "f2111111-1111-4111-8111-111111111111",
    "f1222222-2222-4222-8222-222222222222",
    "f2222222-2222-4222-8222-222222222222",
    "f1333333-3333-4333-8333-333333333333",
    "f2333333-3333-4333-8333-333333333333",
    "f3333333-3333-4333-8333-333333333333",
]
CLIENTS = USERS[0], USERS[2], USERS[4]


def cleanup() -> None:
    for index, client in enumerate(CLIENTS, start=1):
        lease = f"ff{index}11111-1111-4111-8111-111111111111"
        try:
            sql(
                "insert into private.account_deletions(user_id,ready_at,lease,lease_until) "
                f"values('{client}',clock_timestamp()-interval '1 second','{lease}',clock_timestamp()+interval '5 minutes') "
                "on conflict(user_id) do update set ready_at=excluded.ready_at,lease=excluded.lease,lease_until=excluded.lease_until; "
                f"select public.prepare_account_deletion('{client}','{lease}');"
            )
        except Exception:
            pass
    try:
        sql("delete from auth.users where id in (" + ",".join(f"'{user}'" for user in USERS) + ");")
    except Exception:
        pass


try:
    sql(
        "insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) "
        "select '00000000-0000-0000-0000-000000000000',id::uuid,'authenticated','authenticated',name||'@messaging-lock.example.test','',now(),'{}','{}',now(),now() from (values "
        "('f1111111-1111-4111-8111-111111111111','pause-client'),('f2111111-1111-4111-8111-111111111111','pause-coach'),"
        "('f1222222-2222-4222-8222-222222222222','end-client'),('f2222222-2222-4222-8222-222222222222','end-coach'),"
        "('f1333333-3333-4333-8333-333333333333','reassign-client'),('f2333333-3333-4333-8333-333333333333','old-coach'),"
        "('f3333333-3333-4333-8333-333333333333','new-coach')) fixture(id,name);"
        "insert into public.coach_client_relationships(id,coach_user_id,client_user_id,status,started_at) values "
        "('fa111111-1111-4111-8111-111111111111','f2111111-1111-4111-8111-111111111111','f1111111-1111-4111-8111-111111111111','active',now()),"
        "('fa222222-2222-4222-8222-222222222222','f2222222-2222-4222-8222-222222222222','f1222222-2222-4222-8222-222222222222','active',now()),"
        "('fa333333-3333-4333-8333-333333333333','f2333333-3333-4333-8333-333333333333','f1333333-3333-4333-8333-333333333333','active',now());"
        "insert into public.conversations(id,relationship_id) values "
        "('fb111111-1111-4111-8111-111111111111','fa111111-1111-4111-8111-111111111111'),"
        "('fb333333-3333-4333-8333-333333333333','fa333333-3333-4333-8333-333333333333');"
        "insert into public.conversation_participants(conversation_id,user_id,participant_role) values "
        "('fb111111-1111-4111-8111-111111111111','f1111111-1111-4111-8111-111111111111','client'),"
        "('fb111111-1111-4111-8111-111111111111','f2111111-1111-4111-8111-111111111111','coach'),"
        "('fb333333-3333-4333-8333-333333333333','f1333333-3333-4333-8333-333333333333','client'),"
        "('fb333333-3333-4333-8333-333333333333','f2333333-3333-4333-8333-333333333333','coach');"
        "insert into public.conversation_ai_settings(conversation_id) values "
        "('fb111111-1111-4111-8111-111111111111'),('fb333333-3333-4333-8333-333333333333');"
    )

    holder = start_holder(CLIENTS[0], "select (public.send_message('fb111111-1111-4111-8111-111111111111','serialized send')).id")
    assert_relationship_update_blocks("update public.coach_client_relationships set status='paused' where id='fa111111-1111-4111-8111-111111111111';")
    commit_holder(holder)
    sql("update public.coach_client_relationships set status='paused' where id='fa111111-1111-4111-8111-111111111111';")

    holder = start_holder(CLIENTS[1], "select (public.get_or_create_conversation('fa222222-2222-4222-8222-222222222222')).id")
    assert_relationship_update_blocks("update public.coach_client_relationships set status='ended',ended_at=now() where id='fa222222-2222-4222-8222-222222222222';")
    commit_holder(holder)
    sql("update public.coach_client_relationships set status='ended',ended_at=now() where id='fa222222-2222-4222-8222-222222222222';")

    holder = start_holder(CLIENTS[2], "select (public.send_message('fb333333-3333-4333-8333-333333333333','serialized reassignment')).id")
    assert_relationship_update_blocks(
        "update public.coach_client_relationships set status='ended',ended_at=now() where id='fa333333-3333-4333-8333-333333333333'; "
        "insert into public.coach_client_relationships(id,coach_user_id,client_user_id,status,started_at) values "
        "('fa444444-4444-4444-8444-444444444444','f3333333-3333-4333-8333-333333333333','f1333333-3333-4333-8333-333333333333','active',now());"
    )
    commit_holder(holder)
    sql(
        "update public.coach_client_relationships set status='ended',ended_at=now() where id='fa333333-3333-4333-8333-333333333333'; "
        "insert into public.coach_client_relationships(id,coach_user_id,client_user_id,status,started_at) values "
        "('fa444444-4444-4444-8444-444444444444','f3333333-3333-4333-8333-333333333333','f1333333-3333-4333-8333-333333333333','active',now());"
    )
    print("Messaging concurrency: 3/3 two-session relationship-lock scenarios passed")
finally:
    cleanup()
