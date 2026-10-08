"""Create or update a teacher credential in the local teachers.json file."""

import getpass
import hashlib
import json
import os
import secrets
from pathlib import Path


TEACHERS_FILE = Path(os.getenv("TEACHERS_FILE", Path(__file__).with_name("teachers.json")))
PASSWORD_HASH_ITERATIONS = 310_000


def main():
    username = input("Teacher username: ").strip()
    if not username:
        raise SystemExit("Username cannot be empty")

    password = getpass.getpass("Teacher password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if not password or password != confirmation:
        raise SystemExit("Passwords must be non-empty and match")

    if TEACHERS_FILE.exists():
        teachers_data = json.loads(TEACHERS_FILE.read_text(encoding="utf-8"))
    else:
        teachers_data = {"teachers": {}}

    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS
    )
    teachers_data.setdefault("teachers", {})[username] = {
        "salt": salt.hex(),
        "password_hash": password_hash.hex(),
    }

    TEACHERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TEACHERS_FILE.write_text(json.dumps(teachers_data, indent=2) + "\n", encoding="utf-8")
    TEACHERS_FILE.chmod(0o600)
    print(f"Teacher credentials saved to {TEACHERS_FILE}")


if __name__ == "__main__":
    main()