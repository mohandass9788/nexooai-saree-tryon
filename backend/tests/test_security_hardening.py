import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_pin_verification_rate_limiting():
    """
    Brute force prevention: 5 consecutive failed PIN attempts from same kiosk triggers HTTP 429.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        test_kiosk_id = "KIOSK-BRUTE-TEST-01"
        # 1-4. Four invalid attempts return 401
        for _ in range(4):
            res = await client.post(
                "/api/v1/auth/kiosk-pin-verify",
                json={"pin": "000000", "kiosk_id": test_kiosk_id},
            )
            assert res.status_code == 401

        # 5th invalid attempt return 401 and records 5th failure
        res_fifth = await client.post(
            "/api/v1/auth/kiosk-pin-verify",
            json={"pin": "000000", "kiosk_id": test_kiosk_id},
        )
        assert res_fifth.status_code == 401

        # 6th attempt is blocked with 429 Too Many Requests
        res_blocked = await client.post(
            "/api/v1/auth/kiosk-pin-verify",
            json={"pin": "849201", "kiosk_id": test_kiosk_id},
        )
        assert res_blocked.status_code == 429
        assert "Too many failed PIN attempts" in res_blocked.json()["detail"]


@pytest.mark.asyncio
async def test_production_mode_rejects_default_admin_pin(monkeypatch):
    """
    In production mode (APP_ENV=production), the default master PIN '849201' is strictly rejected.
    """
    monkeypatch.setattr(settings, "APP_ENV", "production")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/kiosk-pin-verify",
            json={"pin": "849201", "kiosk_id": "KIOSK-PROD-TEST"},
        )
        assert res.status_code == 403
        assert "disabled in production" in res.json()["detail"]


@pytest.mark.asyncio
async def test_production_mode_rejects_default_staff_pins(monkeypatch):
    """
    In production mode, default test PINs '5521' and '1234' are rejected with 403.
    """
    monkeypatch.setattr(settings, "APP_ENV", "production")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_5521 = await client.post(
            "/api/v1/auth/staff-kiosk-verify",
            json={"pin": "5521", "device_id": "DEV-PROD-01"},
        )
        assert res_5521.status_code == 403
        assert "disabled in production" in res_5521.json()["detail"]

        res_1234 = await client.post(
            "/api/v1/auth/staff-kiosk-verify",
            json={"pin": "1234", "device_id": "DEV-PROD-02"},
        )
        assert res_1234.status_code == 403


@pytest.mark.asyncio
async def test_production_mode_rejects_query_string_auth_tokens(monkeypatch, super_admin_token):
    """
    In production mode, passing auth tokens in URL query string is rejected with HTTP 400.
    """
    monkeypatch.setattr(settings, "APP_ENV", "production")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"/api/v1/admin/metrics?token={super_admin_token}")
        assert res.status_code == 400
        assert "query parameters is prohibited in production" in res.json()["detail"]


@pytest.mark.asyncio
async def test_production_mode_rejects_query_string_tenant_api_key(monkeypatch):
    """
    In production mode, tenant catalog sync with ?api_key= in URL is rejected with HTTP 400.
    """
    monkeypatch.setattr(settings, "APP_ENV", "production")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/tenant/catalog/sync?api_key=sk_live_test123",
            json={"products": [{"sku": "SKU-PROD-01", "name_en": "A", "name_ta": "B", "primary_image_url": "http://x", "price": 1000}]},
        )
        assert res.status_code == 400
        assert "query parameters is prohibited in production" in res.json()["detail"]
