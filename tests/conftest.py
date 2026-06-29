import os
import sys
import tempfile

TMP = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
TMP.close()
os.environ["DATABASE_URL"] = f"sqlite:///{TMP.name}"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["TESTING"] = "1"
os.environ["CORS_ORIGINS"] = "http://testserver"

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "backend"))

import pytest
from fastapi.testclient import TestClient

from main import app  # noqa: E402
from database import Base, engine  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    from migrate import run_migrations
    run_migrations(engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    # registers a user via the api and returns (cookie headers, user dict).
    # tests use this to skip the auth boilerplate.
    def _make(email="alice@test.com", name="Alice"):
        r = client.post("/api/auth/register", json={
            "name": name, "email": email, "password": "secret123",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        token = r.cookies.get("domify_token")
        headers = {"Cookie": f"domify_token={token}"} if token else {}
        return (headers, data["user"])
    return _make
