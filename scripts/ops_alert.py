#!/usr/bin/env python3
"""Minimal destination-neutral operations failure alert hook."""

import argparse
import datetime as dt
import json
import os
import urllib.parse
import urllib.request

ALLOWED_EVENTS = {
    "backup_failure": "storage-backup",
    "notification_scheduler_failure": "notification-scheduler",
    "food_cleanup_failure": "food-cleanup",
}


def build_payload(event, environment):
    if event not in ALLOWED_EVENTS:
        raise ValueError("Unsupported operations alert event")
    return {
        "schema": "tfk.ops-alert.v1",
        "event": event,
        "component": ALLOWED_EVENTS[event],
        "severity": "critical",
        "status": "firing",
        "environment": environment,
        "occurred_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def deliver(event, endpoint, token=None, environment="unknown", timeout=10):
    parsed = urllib.parse.urlparse(endpoint)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("Alert endpoint must be an HTTPS URL without embedded credentials")
    body = json.dumps(build_payload(event, environment), separators=(",", ":")).encode()
    headers = {"Content-Type": "application/json", "User-Agent": "tfk-ops-alert/1"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        if response.status < 200 or response.status >= 300:
            raise RuntimeError("Alert destination rejected the event")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Deliver a sanitized TFK operations failure event")
    parser.add_argument("event", choices=sorted(ALLOWED_EVENTS))
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args(argv)
    payload = build_payload(args.event, os.getenv("TFK_OPS_ENVIRONMENT", "unknown"))
    if args.validate_only:
        print(json.dumps(payload, sort_keys=True))
        return 0
    endpoint = os.getenv("TFK_OPS_ALERT_WEBHOOK_URL")
    if not endpoint:
        print("ALERT_DELIVERY_NOT_CONFIGURED", file=__import__("sys").stderr)
        return 2
    deliver(args.event, endpoint, os.getenv("TFK_OPS_ALERT_TOKEN"), payload["environment"])
    print("ALERT_DELIVERED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
