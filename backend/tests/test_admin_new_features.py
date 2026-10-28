import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_get_todays_customers(staff_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/admin/customers/today", headers=staff_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_customers_today" in data
        assert "customers" in data
        assert isinstance(data["customers"], list)


@pytest.mark.asyncio
async def test_get_and_update_settings(super_admin_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Get settings
        response = await client.get("/api/v1/admin/settings", headers=super_admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "active_ai_provider" in data
        assert "available_providers" in data
        assert "photo_retention_minutes" in data
        assert "idle_attract_timeout_seconds" in data

        # Update settings
        update_payload = {
            "active_ai_provider": "mock",
            "photo_retention_minutes": 60,
            "idle_attract_timeout_seconds": 12,
            "idle_attract_enabled": True,
        }
        post_resp = await client.post("/api/v1/admin/settings", json=update_payload, headers=super_admin_headers)
        assert post_resp.status_code == 200
        updated = post_resp.json()
        assert updated["active_ai_provider"] == "mock"
        assert updated["photo_retention_minutes"] == 60
        assert updated["idle_attract_timeout_seconds"] == 12

    # Reset in-memory cache for test isolation
    from backend.app.core.system_settings import _CACHE
    _CACHE["ai_provider"] = None


@pytest.mark.asyncio
async def test_test_provider_endpoint(super_admin_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/admin/settings/test-provider", json={"provider": "mock"}, headers=super_admin_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        resp_fashn = await client.post("/api/v1/admin/settings/test-provider", json={"provider": "fashn", "api_key": "fa-demo12345"}, headers=super_admin_headers)
        assert resp_fashn.status_code == 200
        assert resp_fashn.json()["success"] is True


@pytest.mark.asyncio
async def test_purge_expired_endpoint(super_admin_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/admin/customers/purge-expired", headers=super_admin_headers)
        assert resp.status_code == 200
        assert "purged_media_files" in resp.json()


@pytest.mark.asyncio
async def test_change_admin_pin_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Invalid current PIN
        bad_resp = await client.post(
            "/api/v1/auth/change-admin-pin",
            json={"current_pin": "000000", "new_pin": "654321"},
        )
        assert bad_resp.status_code == 400

        # Successful PIN change
        good_resp = await client.post(
            "/api/v1/auth/change-admin-pin",
            json={"current_pin": "849201", "new_pin": "654321"},
        )
        assert good_resp.status_code == 200
        assert good_resp.json()["success"] is True

        # Verify new PIN unlocks admin
        auth_resp = await client.post(
            "/api/v1/auth/kiosk-pin-verify",
            json={"pin": "654321", "kiosk_id": "KIOSK-01"},
        )
        assert auth_resp.status_code == 200
        assert auth_resp.json()["authenticated"] is True

        # Reset PIN back to default 849201
        reset_resp = await client.post(
            "/api/v1/auth/change-admin-pin",
            json={"current_pin": "654321", "new_pin": "849201"},
        )
        assert reset_resp.status_code == 200
