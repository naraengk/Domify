def test_create_and_join_house(client, auth_headers):
    h_alice, _ = auth_headers("alice@x.com", "Alice")
    h_bob, _ = auth_headers("bob@x.com", "Bob")

    r = client.post("/api/houses", json={"name": "Casa", "address": "1 St"}, headers=h_alice)
    assert r.status_code == 200
    house = r.json()
    assert house["role"] == "admin"

    # bob joins by code
    j = client.post("/api/houses/join", json={"invite_code": house["invite_code"]}, headers=h_bob)
    assert j.status_code == 200
    assert j.json()["role"] == "member"

    # bad code fails
    bad = client.post("/api/houses/join", json={"invite_code": "NOPE"}, headers=h_bob)
    assert bad.status_code == 404

    # both see members
    m = client.get(f"/api/houses/{house['id']}/members", headers=h_alice)
    assert m.status_code == 200
    assert len(m.json()) == 2


def test_non_member_cannot_view(client, auth_headers):
    h_a, _ = auth_headers("a@x.com")
    h_b, _ = auth_headers("b@x.com")

    house = client.post("/api/houses", json={"name": "A"}, headers=h_a).json()
    r = client.get(f"/api/houses/{house['id']}/members", headers=h_b)
    assert r.status_code == 403
