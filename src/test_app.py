import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import app as app_module


class TeacherAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.credentials_path = Path(self.temp_dir.name) / "teachers.json"
        salt = b"test-salt-for-teacher"
        password_hash = hashlib.pbkdf2_hmac(
            "sha256", b"correct-horse", salt, app_module.PASSWORD_HASH_ITERATIONS
        )
        self.credentials_path.write_text(
            json.dumps({
                "teachers": {
                    "teacher": {
                        "salt": salt.hex(),
                        "password_hash": password_hash.hex(),
                    }
                }
            }),
            encoding="utf-8",
        )
        self.original_teachers_file = app_module.TEACHERS_FILE
        self.original_activities = copy.deepcopy(app_module.activities)
        app_module.TEACHERS_FILE = self.credentials_path
        app_module.activities = copy.deepcopy(self.original_activities)
        self.client = TestClient(app_module.app)

    def tearDown(self):
        self.client.close()
        app_module.TEACHERS_FILE = self.original_teachers_file
        app_module.activities = self.original_activities
        self.temp_dir.cleanup()

    def test_public_read_and_anonymous_mutations(self):
        response = self.client.get("/activities")
        self.assertEqual(response.status_code, 200)
        self.assertIn("michael@mergington.edu", response.json()["Chess Club"]["participants"])

        signup = self.client.post(
            "/activities/Chess Club/signup", params={"email": "new@mergington.edu"}
        )
        unregister = self.client.delete(
            "/activities/Chess Club/unregister", params={"email": "michael@mergington.edu"}
        )
        self.assertEqual(signup.status_code, 401)
        self.assertEqual(unregister.status_code, 401)

    def test_teacher_can_login_and_manage_signups(self):
        login = self.client.post(
            "/admin/login", json={"username": "teacher", "password": "correct-horse"}
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(self.client.get("/admin/session").json()["authenticated"], True)

        signup = self.client.post(
            "/activities/Chess Club/signup", params={"email": "new@mergington.edu"}
        )
        self.assertEqual(signup.status_code, 200)

        unregister = self.client.delete(
            "/activities/Chess Club/unregister", params={"email": "michael@mergington.edu"}
        )
        self.assertEqual(unregister.status_code, 200)

        logout = self.client.post("/admin/logout")
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(self.client.get("/admin/session").json()["authenticated"], False)

    def test_invalid_teacher_credentials_are_rejected(self):
        response = self.client.post(
            "/admin/login", json={"username": "teacher", "password": "wrong-password"}
        )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()