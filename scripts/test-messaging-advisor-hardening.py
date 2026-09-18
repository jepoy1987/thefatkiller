#!/usr/bin/env python3
"""Source-integrity checks for the messaging advisor follow-up."""

from hashlib import sha256
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FOUNDATION = ROOT / "supabase/migrations/20260916155757_messaging_foundation.sql"
HARDENING = ROOT / "supabase/migrations/20260917190806_messaging_advisor_hardening.sql"
EXPECTED_FOUNDATION_SHA256 = "2349113619728daf2ac089decedbbe89b9b4162c91efa0d7112ab0f9e4e8d6da"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


foundation_hash = sha256(FOUNDATION.read_bytes()).hexdigest()
require(
    foundation_hash == EXPECTED_FOUNDATION_SHA256,
    f"messaging foundation migration changed: {foundation_hash}",
)
require(HARDENING.is_file(), f"hardening migration missing: {HARDENING}")

print("Messaging advisor source integrity: foundation SHA-256 verified")
