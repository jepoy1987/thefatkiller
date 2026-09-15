#!/usr/bin/env python3
"""Checksum/manifest tests for the operational Storage backup tooling."""

import importlib.util
import datetime as dt
import json
import pathlib
import tempfile
import unittest

SCRIPTS = pathlib.Path(__file__).resolve().parent


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


backup = load("storage_backup", "storage-backup.py")
alerts = load("ops_alert", "ops_alert.py")


class ManifestVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="tfk-checksum-test-")
        self.root = pathlib.Path(self.temporary.name)
        self.relative = pathlib.Path("objects/progress-photos/11111111-1111-4111-8111-111111111111/photo.jpg")
        target = self.root / self.relative
        target.parent.mkdir(parents=True)
        target.write_bytes(b"verified photo bytes")
        digest = __import__("hashlib").sha256(target.read_bytes()).hexdigest()
        self.manifest = {
            "schema": backup.MANIFEST_VERSION,
            "object_count": 1,
            "total_bytes": len(target.read_bytes()),
            "objects": [{
                "bucket": "progress-photos",
                "path": "11111111-1111-4111-8111-111111111111/photo.jpg",
                "archive_path": self.relative.as_posix(),
                "application_owner_id": "11111111-1111-4111-8111-111111111111",
                "bytes": len(target.read_bytes()),
                "sha256": digest,
            }],
        }
        self.write_manifest()

    def tearDown(self):
        self.temporary.cleanup()

    def write_manifest(self):
        (self.root / "manifest.json").write_text(json.dumps(self.manifest))

    def test_manifest_matches_objects_and_checksums(self):
        self.assertEqual(backup.verify_directory(self.root), {"object_count": 1, "total_bytes": 20})

    def test_missing_object_detected(self):
        (self.root / self.relative).unlink()
        with self.assertRaisesRegex(backup.BackupError, "missing"):
            backup.verify_directory(self.root)

    def test_corrupted_object_detected(self):
        (self.root / self.relative).write_bytes(b"corrupt")
        with self.assertRaisesRegex(backup.BackupError, "checksum"):
            backup.verify_directory(self.root)

    def test_unexpected_object_detected(self):
        unexpected = self.root / "objects/food-analysis/unexpected.jpg"
        unexpected.parent.mkdir(parents=True)
        unexpected.write_bytes(b"unexpected")
        with self.assertRaisesRegex(backup.BackupError, "unexpected"):
            backup.verify_directory(self.root)

    def test_owner_path_mismatch_detected(self):
        self.manifest["objects"][0]["application_owner_id"] = "22222222-2222-4222-8222-222222222222"
        self.write_manifest()
        with self.assertRaisesRegex(backup.BackupError, "owner"):
            backup.verify_directory(self.root)

    def test_expired_food_object_detected(self):
        entry = self.manifest["objects"][0]
        entry.update({
            "bucket": "food-analysis",
            "archive_path": "objects/food-analysis/11111111-1111-4111-8111-111111111111/photo.jpg",
            "food_expires_at": "2000-01-01T00:00:00+00:00",
        })
        self.write_manifest()
        with self.assertRaisesRegex(backup.BackupError, "expired"):
            backup.verify_directory(self.root)


class AlertIntegrationTests(unittest.TestCase):
    def test_all_required_failures_have_sanitized_payloads(self):
        for event in ("backup_failure", "notification_scheduler_failure", "food_cleanup_failure"):
            payload = alerts.build_payload(event, "staging")
            self.assertEqual(payload["event"], event)
            self.assertEqual(payload["severity"], "critical")
            self.assertNotIn("recipient", payload)
            self.assertNotIn("details", payload)


class FoodRetentionTests(unittest.TestCase):
    def test_only_expired_strictly_named_food_archives_are_selected(self):
        with tempfile.TemporaryDirectory(prefix="tfk-prune-test-") as temporary:
            root = pathlib.Path(temporary)
            expired = root / "run-food-delete-by-20260915T010000Z.tar.age"
            current = root / "run-food-delete-by-20260915T030000Z.tar.age"
            unrelated = root / "notes.txt"
            for path in (expired, current, unrelated):
                path.write_bytes(b"fixture")
            now = dt.datetime(2026, 9, 15, 2, tzinfo=dt.timezone.utc)
            self.assertEqual(backup.expired_food_archives(root, now), [expired])
            result = backup.prune_food_archives(root, apply=False)
            self.assertTrue(expired.exists())
            self.assertEqual(result["status"], "FOOD_BACKUP_PRUNE_DRY_RUN")


if __name__ == "__main__":
    unittest.main(verbosity=2)
