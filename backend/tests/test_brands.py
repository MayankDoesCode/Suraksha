import json

def test_create_and_get_brand_profile(client):
    """Test full creation of a brand profile with relational assets and retrieval."""
    payload = {
        "name": "Acme Global Financial",
        "description": "Leading digital banking and investment enterprise",
        "logo_url": "https://assets.acmeglobal.com/logo.png",
        "domains": [
            {"domain": "acmeglobal.com", "is_primary": True},
            {"domain": "acmepay.io", "is_primary": False}
        ],
        "social_handles": [
            {"platform": "twitter", "handle": "acmeglobal", "url": "https://twitter.com/acmeglobal"},
            {"platform": "linkedin", "handle": "acme-global", "url": "https://linkedin.com/company/acme-global"}
        ],
        "app_identifiers": [
            {"platform": "android_play_store", "identifier": "com.acmeglobal.bank", "app_name": "Acme Mobile Bank"},
            {"platform": "ios_app_store", "identifier": "id123456789", "app_name": "Acme Mobile"}
        ],
        "publishers": [
            {"publisher_name": "Acme Technologies Inc.", "platform": "all"}
        ]
    }

    create_res = client.post("/api/v1/brands", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.get_json()
    assert created_data["success"] is True
    brand = created_data["data"]
    brand_id = brand["id"]

    assert brand["name"] == "Acme Global Financial"
    assert len(brand["domains"]) == 2
    assert len(brand["social_handles"]) == 2
    assert len(brand["app_identifiers"]) == 2
    assert len(brand["publishers"]) == 1

    # Retrieve by ID
    get_res = client.get(f"/api/v1/brands/{brand_id}")
    assert get_res.status_code == 200
    retrieved = get_res.get_json()["data"]
    assert retrieved["id"] == brand_id
    assert retrieved["name"] == "Acme Global Financial"
    assert retrieved["domains"][0]["domain"] in ["acmeglobal.com", "acmepay.io"]

def test_list_brands_with_pagination_and_search(client):
    """Test brand listing, pagination metadata, and search filtering."""
    client.post("/api/v1/brands", json={"name": "Alpha Shield Corp"})
    client.post("/api/v1/brands", json={"name": "Beta Defense Tech"})
    client.post("/api/v1/brands", json={"name": "Gamma Security Lab"})

    # List all
    res = client.get("/api/v1/brands")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["data"]) == 3
    assert data["pagination"]["total"] == 3

    # Search filter
    search_res = client.get("/api/v1/brands?search=Defense")
    assert search_res.status_code == 200
    search_data = search_res.get_json()
    assert len(search_data["data"]) == 1
    assert search_data["data"][0]["name"] == "Beta Defense Tech"

    # Pagination
    page_res = client.get("/api/v1/brands?page=1&per_page=2")
    assert page_res.status_code == 200
    page_data = page_res.get_json()
    assert len(page_data["data"]) == 2
    assert page_data["pagination"]["total_pages"] == 2

def test_update_brand_profile(client):
    """Test updating brand details and synchronizing related domains."""
    create_res = client.post("/api/v1/brands", json={
        "name": "SecureBank",
        "description": "Original description",
        "domains": [{"domain": "securebank.com", "is_primary": True}]
    })
    brand_id = create_res.get_json()["data"]["id"]

    update_payload = {
        "description": "Updated security platform description",
        "domains": [
            {"domain": "securebank.com", "is_primary": True},
            {"domain": "securebank.org", "is_primary": False}
        ]
    }
    update_res = client.put(f"/api/v1/brands/{brand_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.get_json()["data"]
    assert updated["description"] == "Updated security platform description"
    assert len(updated["domains"]) == 2

def test_delete_brand_profile_cascades(client):
    """Test brand deletion removes brand and cascades cleanly."""
    create_res = client.post("/api/v1/brands", json={
        "name": "TempCorp",
        "domains": [{"domain": "tempcorp.com"}]
    })
    brand_id = create_res.get_json()["data"]["id"]

    # Delete
    del_res = client.delete(f"/api/v1/brands/{brand_id}")
    assert del_res.status_code == 200

    # Ensure it's gone
    get_res = client.get(f"/api/v1/brands/{brand_id}")
    assert get_res.status_code == 404

def test_duplicate_brand_name_returns_409(client):
    """Verify system blocks registering duplicate brand names with 409 Conflict."""
    client.post("/api/v1/brands", json={"name": "Sentinel Org"})
    duplicate_res = client.post("/api/v1/brands", json={"name": "sentinel org"})
    assert duplicate_res.status_code == 409
    err = duplicate_res.get_json()["error"]
    assert err["code"] == "CONFLICT_ERROR"

def test_validation_errors(client):
    """Verify invalid inputs trigger 422 with clear structured error details."""
    # Missing name
    res1 = client.post("/api/v1/brands", json={"description": "No name provided"})
    assert res1.status_code == 422
    assert res1.get_json()["error"]["code"] == "VALIDATION_ERROR"

    # Invalid domain
    res2 = client.post("/api/v1/brands", json={
        "name": "Invalid Domain Co",
        "domains": [{"domain": "not a domain!!@#"}]
    })
    assert res2.status_code == 422

    # Malicious or invalid logo scheme
    res3 = client.post("/api/v1/brands", json={
        "name": "Bad Scheme Co",
        "logo_url": "javascript:alert(1)"
    })
    assert res3.status_code == 422

def test_get_nonexistent_brand_returns_404(client):
    """Verify querying non-existent brand returns 404 with standard format."""
    res = client.get("/api/v1/brands/non-existent-uuid-12345")
    assert res.status_code == 404
    err = res.get_json()["error"]
    assert err["code"] == "NOT_FOUND"
