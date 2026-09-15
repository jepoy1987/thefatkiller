#!/usr/bin/env python3
"""Bounded, encrypted Supabase Storage export and checksum verification."""

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

MANIFEST_VERSION = "tfk.storage-backup.v1"
BUCKETS = {"progress-photos", "food-analysis"}


class BackupError(RuntimeError):
    pass


class SupabaseSource:
    def __init__(self, url, key, timeout=30, retries=3):
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
            raise BackupError("SUPABASE_URL must be an absolute HTTP(S) URL without embedded credentials")
        self.url = url.rstrip("/")
        self.key = key
        self.timeout = timeout
        self.retries = retries

    def _request(self, path, body=None):
        headers = {
            "apikey": self.key,
            "Authorization": "Bearer " + self.key,
            "User-Agent": "tfk-storage-backup/1",
        }
        data = None
        if body is not None:
            data = json.dumps(body, separators=(",", ":")).encode()
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(self.url + path, data=data, headers=headers,
                                         method="POST" if body is not None else "GET")
        for attempt in range(self.retries):
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    return response.read()
            except (urllib.error.URLError, TimeoutError) as error:
                retryable = not isinstance(error, urllib.error.HTTPError) or error.code in {408, 429, 500, 502, 503, 504}
                if not retryable or attempt + 1 == self.retries:
                    raise BackupError("Source request failed after bounded retries") from error
                time.sleep(min(2 ** attempt, 4))
        raise BackupError("Source request failed")

    def candidates(self, page_size):
        after_bucket = after_path = ""
        while True:
            raw = self._request("/rest/v1/rpc/storage_backup_candidates", {
                "p_after_bucket": after_bucket,
                "p_after_path": after_path,
                "p_limit": page_size,
            })
            rows = json.loads(raw)
            if not isinstance(rows, list):
                raise BackupError("Backup inventory returned an invalid response")
            for row in rows:
                yield row
            if len(rows) < page_size:
                break
            after_bucket, after_path = rows[-1]["bucket_id"], rows[-1]["object_path"]

    def download(self, bucket, path):
        return self._request("/storage/v1/object/" + urllib.parse.quote(bucket, safe="") + "/" + urllib.parse.quote(path, safe="/"))

    def current(self, row):
        raw = self._request("/rest/v1/rpc/storage_backup_candidate_current", {
            "p_bucket": row["bucket_id"],
            "p_path": row["object_path"],
            "p_source_id": row["source_id"],
            "p_storage_id": row["storage_id"],
            "p_storage_updated_at": row.get("storage_updated_at"),
        })
        return json.loads(raw) is True


def safe_object_path(bucket, object_path, owner):
    if bucket not in BUCKETS or not isinstance(object_path, str) or not isinstance(owner, str):
        raise BackupError("Invalid backup candidate metadata")
    pure = pathlib.PurePosixPath(object_path)
    if pure.is_absolute() or not pure.parts or any(part in {"", ".", ".."} for part in pure.parts):
        raise BackupError("Unsafe Storage object path")
    if pure.parts[0] != owner or "\\" in object_path:
        raise BackupError("Storage path does not match its application owner")
    return pathlib.Path("objects", bucket, *pure.parts)


def _copy_one(source, root, row, max_object_bytes):
    relative = safe_object_path(row.get("bucket_id"), row.get("object_path"), row.get("application_owner_id"))
    content = source.download(row["bucket_id"], row["object_path"])
    if len(content) > max_object_bytes:
        raise BackupError("Storage object exceeds the configured byte bound")
    if not source.current(row):
        raise BackupError("Storage candidate changed or expired during export")
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    os.chmod(target, 0o600)
    return {
        "bucket": row["bucket_id"],
        "path": row["object_path"],
        "archive_path": relative.as_posix(),
        "application_owner_id": row["application_owner_id"],
        "source_table": row["source_table"],
        "source_id": row["source_id"],
        "source_created_at": row.get("source_created_at"),
        "food_status": row.get("food_status"),
        "food_expires_at": row.get("food_expires_at"),
        "storage_id": row.get("storage_id"),
        "storage_owner_id": row.get("storage_owner_id"),
        "storage_created_at": row.get("storage_created_at"),
        "storage_updated_at": row.get("storage_updated_at"),
        "storage_metadata": row.get("storage_metadata") or {},
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
    }


def verify_directory(root):
    root = pathlib.Path(root)
    manifest_path = root / "manifest.json"
    if not manifest_path.is_file():
        raise BackupError("Backup manifest is missing")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise BackupError("Backup manifest is unreadable") from error
    if manifest.get("schema") != MANIFEST_VERSION or not isinstance(manifest.get("objects"), list):
        raise BackupError("Backup manifest schema is invalid")
    expected = {"manifest.json"}
    identities = set()
    total = 0
    now = dt.datetime.now(dt.timezone.utc)
    for entry in manifest["objects"]:
        relative = safe_object_path(entry.get("bucket"), entry.get("path"), entry.get("application_owner_id"))
        if entry.get("archive_path") != relative.as_posix():
            raise BackupError("Manifest does not preserve bucket/path")
        identity = (entry["bucket"], entry["path"])
        if identity in identities:
            raise BackupError("Manifest contains a duplicate object")
        identities.add(identity)
        if entry["bucket"] == "food-analysis":
            try:
                expires = dt.datetime.fromisoformat(entry["food_expires_at"].replace("Z", "+00:00"))
            except (KeyError, AttributeError, ValueError) as error:
                raise BackupError("Food backup expiry is invalid") from error
            if expires <= now:
                raise BackupError("Backup contains an expired food object")
        expected.add(relative.as_posix())
        target = root / relative
        if not target.is_file():
            raise BackupError("Manifest object is missing")
        digest = hashlib.sha256()
        size = 0
        with target.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                size += len(chunk)
                digest.update(chunk)
        if size != entry.get("bytes") or digest.hexdigest() != entry.get("sha256"):
            raise BackupError("Manifest object checksum or size mismatch")
        total += size
    actual = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()}
    unexpected = actual - expected
    if unexpected:
        raise BackupError("Backup contains an unexpected object")
    if len(manifest["objects"]) != manifest.get("object_count") or total != manifest.get("total_bytes"):
        raise BackupError("Manifest totals do not match objects")
    return {"object_count": len(identities), "total_bytes": total}


def _safe_extract(archive, target):
    target = pathlib.Path(target).resolve()
    with tarfile.open(archive, "r") as bundle:
        for member in bundle.getmembers():
            resolved = (target / member.name).resolve()
            if resolved != target and target not in resolved.parents:
                raise BackupError("Encrypted archive contains an unsafe path")
            if member.issym() or member.islnk() or member.isdev():
                raise BackupError("Encrypted archive contains an unsupported entry")
        bundle.extractall(target)


def encrypt_directory(root, destination, recipient, age_binary="age"):
    destination = pathlib.Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    tar_path = pathlib.Path(root).parent / (uuid.uuid4().hex + ".tar.partial")
    encrypted_partial = pathlib.Path(str(destination) + ".partial")
    if destination.exists():
        raise BackupError("Refusing to overwrite an existing backup archive")
    try:
        with tarfile.open(tar_path, "w") as bundle:
            bundle.add(pathlib.Path(root) / "manifest.json", arcname="manifest.json")
            objects = pathlib.Path(root) / "objects"
            if objects.exists():
                bundle.add(objects, arcname="objects")
        result = subprocess.run([age_binary, "--recipient", recipient, "--output", encrypted_partial, tar_path],
                                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        if result.returncode:
            raise BackupError("age encryption failed")
        os.chmod(encrypted_partial, 0o600)
        os.replace(encrypted_partial, destination)
    finally:
        for partial in (tar_path, encrypted_partial):
            try:
                partial.unlink()
            except FileNotFoundError:
                pass


def verify_archive(archive, work_dir, identity, age_binary="age"):
    with tempfile.TemporaryDirectory(prefix="tfk-backup-verify-", dir=work_dir) as temporary:
        os.chmod(temporary, 0o700)
        tar_path = pathlib.Path(temporary) / "backup.tar"
        extracted = pathlib.Path(temporary) / "extracted"
        extracted.mkdir(mode=0o700)
        result = subprocess.run([age_binary, "--decrypt", "--identity", identity, "--output", tar_path, archive],
                                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        if result.returncode:
            raise BackupError("age decryption failed")
        _safe_extract(tar_path, extracted)
        return verify_directory(extracted)


def export_backup(args):
    source = SupabaseSource(args.url, args.key, args.timeout, args.retries)
    started = dt.datetime.now(dt.timezone.utc)
    run_id = started.strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex
    with tempfile.TemporaryDirectory(prefix="tfk-storage-export-", dir=args.work_dir) as temporary:
        os.chmod(temporary, 0o700)
        root = pathlib.Path(temporary)
        roots = {
            "progress-photos": root / "progress",
            "food-analysis": root / "food",
        }
        for group_root in roots.values():
            group_root.mkdir(mode=0o700)
        rows = []
        for row in source.candidates(args.page_size):
            rows.append(row)
            if len(rows) > args.max_objects:
                raise BackupError("Backup candidate count exceeds the configured bound")
        entries = []
        for offset in range(0, len(rows), args.concurrency):
            batch = rows[offset:offset + args.concurrency]
            with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
                futures = [executor.submit(_copy_one, source, roots[row["bucket_id"]], row,
                                           args.max_object_bytes) for row in batch]
                for future in concurrent.futures.as_completed(futures):
                    entries.append(future.result())
            if sum(entry["bytes"] for entry in entries) > args.max_total_bytes:
                raise BackupError("Backup total bytes exceed the configured bound")
        entries.sort(key=lambda entry: (entry["bucket"], entry["path"]))
        total = sum(entry["bytes"] for entry in entries)
        archives = []
        try:
            for bucket, group_root in roots.items():
                group_entries = [entry for entry in entries if entry["bucket"] == bucket]
                if bucket == "food-analysis" and not group_entries:
                    continue
                group_total = sum(entry["bytes"] for entry in group_entries)
                delete_by = None
                if bucket == "food-analysis":
                    expiries = [dt.datetime.fromisoformat(entry["food_expires_at"].replace("Z", "+00:00"))
                                for entry in group_entries]
                    delete_by = min(expiries).astimezone(dt.timezone.utc)
                manifest = {
                    "schema": MANIFEST_VERSION,
                    "run_id": run_id,
                    "source_project_url": args.url,
                    "bucket_group": bucket,
                    "started_at": started.isoformat(),
                    "completed_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "delete_by": delete_by.isoformat() if delete_by else None,
                    "object_count": len(group_entries),
                    "total_bytes": group_total,
                    "objects": group_entries,
                }
                manifest_path = group_root / "manifest.json"
                manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                os.chmod(manifest_path, 0o600)
                verify_directory(group_root)
                if delete_by:
                    suffix = "food-delete-by-" + delete_by.strftime("%Y%m%dT%H%M%SZ")
                else:
                    suffix = "progress"
                destination = pathlib.Path(args.destination) / (run_id + "-" + suffix + ".tar.age")
                encrypt_directory(group_root, destination, args.recipient, args.age_binary)
                archives.append(str(destination))
                verify_archive(destination, args.work_dir, args.verify_identity, args.age_binary)
        except Exception:
            for archive in archives:
                pathlib.Path(archive).unlink(missing_ok=True)
            raise
    return {"status": "BACKUP_COMPLETE", "run_id": run_id,
            "object_count": len(entries), "total_bytes": total, "archives": archives}


def expired_food_archives(destination, now=None):
    destination = pathlib.Path(destination)
    now = now or dt.datetime.now(dt.timezone.utc)
    expired = []
    for path in destination.glob("*-food-delete-by-*.tar.age"):
        marker = path.name.split("-food-delete-by-", 1)[1].removesuffix(".tar.age")
        try:
            delete_by = dt.datetime.strptime(marker, "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
        except ValueError:
            continue
        if delete_by <= now:
            expired.append(path)
    return sorted(expired)


def prune_food_archives(destination, apply=False):
    paths = expired_food_archives(destination)
    if apply:
        for path in paths:
            path.unlink()
    return {"status": "FOOD_BACKUP_PRUNE_APPLIED" if apply else "FOOD_BACKUP_PRUNE_DRY_RUN",
            "expired_count": len(paths), "archives": [path.name for path in paths]}


def parser():
    command = argparse.ArgumentParser(description=__doc__)
    subcommands = command.add_subparsers(dest="command", required=True)
    export = subcommands.add_parser("export", help="create a verified age-encrypted Storage archive")
    export.add_argument("--destination", required=True)
    export.add_argument("--work-dir", required=True, help="existing encrypted temporary-work volume")
    export.add_argument("--url", default=os.getenv("SUPABASE_URL"))
    export.set_defaults(key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    export.add_argument("--recipient", default=os.getenv("TFK_BACKUP_AGE_RECIPIENT"))
    export.add_argument("--verify-identity", default=os.getenv("TFK_BACKUP_AGE_IDENTITY"), help=argparse.SUPPRESS)
    export.add_argument("--age-binary", default=os.getenv("TFK_BACKUP_AGE_BINARY", "age"), help=argparse.SUPPRESS)
    export.add_argument("--page-size", type=int, default=100, choices=range(1, 101), metavar="1..100")
    export.add_argument("--concurrency", type=int, default=4, choices=range(1, 5), metavar="1..4")
    export.add_argument("--max-objects", type=int, default=10000)
    export.add_argument("--max-object-bytes", type=int, default=10 * 1024 * 1024)
    export.add_argument("--max-total-bytes", type=int, default=50 * 1024 * 1024 * 1024)
    export.add_argument("--timeout", type=int, default=30)
    export.add_argument("--retries", type=int, default=3, choices=range(1, 4), metavar="1..3")
    verify = subcommands.add_parser("verify", help="decrypt and verify a completed archive")
    verify.add_argument("archive")
    verify.add_argument("--work-dir", required=True, help="existing encrypted temporary-work volume")
    verify.add_argument("--identity", default=os.getenv("TFK_BACKUP_AGE_IDENTITY"), help=argparse.SUPPRESS)
    verify.add_argument("--age-binary", default=os.getenv("TFK_BACKUP_AGE_BINARY", "age"), help=argparse.SUPPRESS)
    prune = subcommands.add_parser("prune-food", help="find or remove food archives past their original retention")
    prune.add_argument("--destination", required=True)
    prune.add_argument("--apply", action="store_true", help="remove only strictly named expired food archives")
    return command


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        if args.command == "export":
            if not args.url or not args.key or not args.recipient or not args.verify_identity:
                raise BackupError("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TFK_BACKUP_AGE_RECIPIENT and TFK_BACKUP_AGE_IDENTITY are required")
            for value, label in ((args.max_objects, "max objects"), (args.max_object_bytes, "max object bytes"),
                                 (args.max_total_bytes, "max total bytes"), (args.timeout, "timeout")):
                if value <= 0:
                    raise BackupError(label + " must be positive")
            result = export_backup(args)
        elif args.command == "verify":
            if not args.identity:
                raise BackupError("TFK_BACKUP_AGE_IDENTITY is required")
            result = {"status": "BACKUP_VERIFIED", **verify_archive(args.archive, args.work_dir, args.identity, args.age_binary)}
        else:
            result = prune_food_archives(args.destination, args.apply)
        print(json.dumps(result, sort_keys=True))
        return 0
    except (BackupError, OSError, subprocess.SubprocessError) as error:
        print("BACKUP_FAILED: " + str(error), file=sys.stderr)
        if os.getenv("TFK_OPS_ALERT_WEBHOOK_URL"):
            try:
                from ops_alert import deliver
                deliver("backup_failure", os.environ["TFK_OPS_ALERT_WEBHOOK_URL"],
                        os.getenv("TFK_OPS_ALERT_TOKEN"), os.getenv("TFK_OPS_ENVIRONMENT", "unknown"))
            except Exception:
                print("BACKUP_FAILURE_ALERT_DELIVERY_FAILED", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
