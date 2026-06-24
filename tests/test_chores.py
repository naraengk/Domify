def _setup_house(client, auth_headers):
    h_a, alice = auth_headers("a@x.com", "Alice")
    h_b, bob = auth_headers("b@x.com", "Bob")
    house = client.post("/api/houses", json={"name": "H"}, headers=h_a).json()
    client.post("/api/houses/join", json={"invite_code": house["invite_code"]}, headers=h_b)
    return house, h_a, h_b, alice, bob


def test_chore_create_complete_rotates(client, auth_headers):
    house, h_a, h_b, alice, bob = _setup_house(client, auth_headers)
    hid = house["id"]
    r = client.post(f"/api/houses/{hid}/chores", json={
        "name": "Trash", "frequency": "weekly",
    }, headers=h_a)
    assert r.status_code == 200
    chore = r.json()
    first = chore["assigned_to"]

    # mark done → should rotate to the other roommate
    done = client.post(f"/api/houses/{hid}/chores/{chore['id']}/complete", headers=h_a)
    assert done.status_code == 200
    assert done.json()["assigned_to"] != first

    hist = client.get(f"/api/houses/{hid}/chores/history", headers=h_a)
    assert hist.status_code == 200
    assert len(hist.json()) == 1


def test_chore_summary(client, auth_headers):
    house, h_a, h_b, alice, bob = _setup_house(client, auth_headers)
    hid = house["id"]
    chore = client.post(f"/api/houses/{hid}/chores", json={"name": "Dishes"}, headers=h_a).json()
    client.post(f"/api/houses/{hid}/chores/{chore['id']}/complete", headers=h_a)
    s = client.get(f"/api/houses/{hid}/chores/summary", headers=h_a).json()
    assert sum(r["completed_this_week"] for r in s) == 1
