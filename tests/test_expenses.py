def _setup(client, auth_headers):
    h_a, alice = auth_headers("a@x.com", "Alice")
    h_b, bob = auth_headers("b@x.com", "Bob")
    house = client.post("/api/houses", json={"name": "H"}, headers=h_a).json()
    client.post("/api/houses/join", json={"invite_code": house["invite_code"]}, headers=h_b)
    return house, h_a, h_b, alice, bob


def test_equal_split_and_balances(client, auth_headers):
    house, h_a, h_b, alice, bob = _setup(client, auth_headers)
    hid = house["id"]
    r = client.post(f"/api/houses/{hid}/expenses", json={
        "title": "Rent", "category": "rent", "amount": 1000,
    }, headers=h_a)
    assert r.status_code == 200
    exp = r.json()
    # each member owes 500
    assert len(exp["splits"]) == 2
    assert all(abs(s["amount_owed"] - 500.0) < 0.01 for s in exp["splits"])

    bal = client.get(f"/api/houses/{hid}/expenses/balances", headers=h_a).json()
    a = next(b for b in bal if b["user_id"] == alice["id"])
    b = next(b for b in bal if b["user_id"] == bob["id"])
    # alice paid, bob owes her 500
    assert a["net"] == 500.0
    assert b["net"] == -500.0


def test_settle_clears_debt(client, auth_headers):
    house, h_a, h_b, alice, bob = _setup(client, auth_headers)
    hid = house["id"]
    client.post(f"/api/houses/{hid}/expenses", json={
        "title": "Pizza", "amount": 40,
    }, headers=h_a)
    # bob pays alice 20
    client.post(f"/api/houses/{hid}/expenses/settle", json={
        "to_user": alice["id"], "amount": 20,
    }, headers=h_b)
    bal = client.get(f"/api/houses/{hid}/expenses/balances", headers=h_a).json()
    a = next(x for x in bal if x["user_id"] == alice["id"])
    assert abs(a["net"]) < 0.01


def test_insights(client, auth_headers):
    house, h_a, _, _, _ = _setup(client, auth_headers)
    hid = house["id"]
    client.post(f"/api/houses/{hid}/expenses", json={"title": "X", "category": "rent", "amount": 1000}, headers=h_a)
    client.post(f"/api/houses/{hid}/expenses", json={"title": "Y", "category": "groceries", "amount": 60}, headers=h_a)
    ins = client.get(f"/api/houses/{hid}/expenses/insights", headers=h_a).json()
    cats = {r["category"] for r in ins["by_category"]}
    assert cats == {"rent", "groceries"}
