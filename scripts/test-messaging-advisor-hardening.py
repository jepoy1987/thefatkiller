#!/usr/bin/env python3
"""Source-integrity checks for the messaging advisor follow-up."""

from hashlib import sha256
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FOUNDATION = ROOT / "supabase/migrations/20260916155757_messaging_foundation.sql"
HARDENING = ROOT / "supabase/migrations/20260917190806_messaging_advisor_hardening.sql"
EXPECTED_FOUNDATION_SHA256 = "2349113619728daf2ac089decedbbe89b9b4162c91efa0d7112ab0f9e4e8d6da"


foundation_hash = sha256(FOUNDATION.read_bytes()).hexdigest()
assert foundation_hash == EXPECTED_FOUNDATION_SHA256, (
    f"messaging foundation migration changed: {foundation_hash}"
)

hardening_sql = HARDENING.read_text(encoding="utf-8").lower()
assert "create index" not in hardening_sql, "redundant FK indexes must not be added"
assert "revoke all on schema private from public, anon" in hardening_sql
assert "grant usage on schema private to authenticated, service_role" in hardening_sql

print("Messaging advisor source integrity: 3/3 checks passed")
