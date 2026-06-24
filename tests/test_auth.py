def test_register_and_login(client):
    r = client.post("/api/auth/register", json={
        "name": "Naraen", "email": "n@test.com", "password": "secret123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()

    # duplicate email rejected
    r2 = client.post("/api/auth/register", json={
        "name": "Naraen", "email": "n@test.com", "password": "secret123",
    })
    assert r2.status_code == 400

    # wrong password rejected
    bad = client.post("/api/auth/login", json={"email": "n@test.com", "password": "wrong"})
    assert bad.status_code == 401

    ok = client.post("/api/auth/login", json={"email": "n@test.com", "password": "secret123"})
    assert ok.status_code == 200


def test_me_requires_auth(client, auth_headers):
    no = client.get("/api/auth/me")
    assert no.status_code == 401

    headers, user = auth_headers()
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == user["email"]
