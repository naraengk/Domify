def _solo_house(client, auth_headers):
    h, user = auth_headers("a@x.com")
    house = client.post("/api/houses", json={"name": "H"}, headers=h).json()
    return house, h, user


def test_grocery_flow(client, auth_headers):
    house, h, user = _solo_house(client, auth_headers)
    hid = house["id"]
    it = client.post(f"/api/houses/{hid}/grocery", json={"name": "Milk", "category": "dairy"}, headers=h).json()
    assert it["is_bought"] is False
    toggled = client.post(f"/api/houses/{hid}/grocery/{it['id']}/toggle", headers=h).json()
    assert toggled["is_bought"] is True
    client.delete(f"/api/houses/{hid}/grocery/bought/clear", headers=h)
    assert client.get(f"/api/houses/{hid}/grocery", headers=h).json() == []


def test_announcements(client, auth_headers):
    house, h, user = _solo_house(client, auth_headers)
    hid = house["id"]
    a = client.post(f"/api/houses/{hid}/announcements", json={
        "title": "Plumber", "message": "Tuesday", "urgency": "high",
    }, headers=h).json()
    assert a["urgency"] == "high"
    client.post(f"/api/houses/{hid}/announcements/{a['id']}/read", headers=h)
    lst = client.get(f"/api/houses/{hid}/announcements", headers=h).json()
    assert lst[0]["is_read"] is True


def test_quiet_hours_admin_only(client, auth_headers):
    h_a, _ = auth_headers("a@x.com")
    h_b, _ = auth_headers("b@x.com")
    house = client.post("/api/houses", json={"name": "H"}, headers=h_a).json()
    client.post("/api/houses/join", json={"invite_code": house["invite_code"]}, headers=h_b)

    hid = house["id"]
    # member can't update
    r = client.put(f"/api/houses/{hid}/quiet/hours", json={
        "start_time": "23:00", "end_time": "07:00", "days": "Mon",
    }, headers=h_b)
    assert r.status_code == 403
    # admin can
    r2 = client.put(f"/api/houses/{hid}/quiet/hours", json={
        "start_time": "23:00", "end_time": "07:00", "days": "Mon",
    }, headers=h_a)
    assert r2.status_code == 200


def test_maintenance_status_update(client, auth_headers):
    house, h, _ = _solo_house(client, auth_headers)
    hid = house["id"]
    m = client.post(f"/api/houses/{hid}/maintenance", json={"title": "Leak"}, headers=h).json()
    assert m["status"] == "reported"
    u = client.patch(f"/api/houses/{hid}/maintenance/{m['id']}", json={"status": "resolved"}, headers=h).json()
    assert u["status"] == "resolved"


def test_conflict_log(client, auth_headers):
    house, h, _ = _solo_house(client, auth_headers)
    hid = house["id"]
    c = client.post(f"/api/houses/{hid}/conflicts", json={"title": "Heat off", "description": "since Tue"}, headers=h).json()
    assert c["title"] == "Heat off"
    lst = client.get(f"/api/houses/{hid}/conflicts", headers=h).json()
    assert len(lst) == 1
