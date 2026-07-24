import sys
import os
import unittest
import requests

BASE_URL = os.getenv("BACKEND_HOST", "http://localhost:8000")

class TestBackendEndpoints(unittest.TestCase):

    def test_root_endpoint(self):
        """Test root endpoint returns 200 and expected status message."""
        try:
            response = requests.get(f"{BASE_URL}/")
            self.assertEqual(response.status_code, 200)
            self.assertIn("running", response.json().get("message", "").lower())
        except requests.exceptions.ConnectionError:
            self.skipTest(f"Backend server not running at {BASE_URL}")

    def test_unauthorized_faculty_list_access(self):
        """Test GET /faculty returns 401 Unauthorized when no auth cookie is provided."""
        try:
            response = requests.get(f"{BASE_URL}/faculty")
            self.assertEqual(response.status_code, 401)
        except requests.exceptions.ConnectionError:
            self.skipTest(f"Backend server not running at {BASE_URL}")

    def test_invalid_login_validation(self):
        """Test POST /admin/signin with invalid payload returns HTTP error."""
        try:
            response = requests.post(f"{BASE_URL}/admin/signin", json={"email": "invalid@test.com"})
            self.assertIn(response.status_code, [400, 401, 422])
        except requests.exceptions.ConnectionError:
            self.skipTest(f"Backend server not running at {BASE_URL}")

if __name__ == "__main__":
    unittest.main()
