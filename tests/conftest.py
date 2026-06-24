import os
import sys
import tempfile

# point tests at a throwaway sqlite file before any backend imports happen
TMP = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
TMP.close()
os.environ["DATABASE_URL"] = f"sqlite:///{TMP.name}"
os.environ["JWT_SECRET"] = "test-secret"

# put backend/ on the path so we can import its modules
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "backend"))

import pytest
from fastapi.testclient import TestClient

from main import app  # noqa: E402
from database import Base, engine  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    # wipe between tests so they don't share state
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Register a user and return headers + the user payload."""
    def _make(email="alice@test.com", name="Alice"):
        r = client.post("/api/auth/register", json={
            "name": name, "email": email, "password": "secret123",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        return ({"Authorization": f"Bearer {data['access_token']}"}, data["user"])
    return _make
