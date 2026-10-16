import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_kiosk_pin_verify_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "pin": settings.KIOSK_ADMIN_PIN,
            "kiosk_id": "KIOSK-TN-CHN-01",
        }
        res = await client.post("/api/v1/auth/kiosk-pin-verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["authenticated"] is True
        assert data["role"] == "store_staff"
        assert "token" in data
        assert data["expires_in_seconds"] == 900


@pytest.mark.asyncio
async def test_kiosk_pin_verify_invalid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "pin": "000000",
            "kiosk_id": "KIOSK-TN-CHN-01",
        }
        res = await client.post("/api/v1/auth/kiosk-pin-verify", json=payload)
        assert res.status_code == 401
        assert "Incorrect Kiosk Security PIN" in res.json()["detail"]


@pytest.mark.asyncio
async def test_verify_token_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First login to obtain token
        login_res = await client.post(
            "/api/v1/auth/kiosk-pin-verify",
            json={"pin": settings.KIOSK_ADMIN_PIN, "kiosk_id": "KIOSK-TN-CHN-01"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["token"]

        # Verify active token
        verify_res = await client.get(f"/api/v1/auth/verify-token?token={token}")
        assert verify_res.status_code == 200
        assert verify_res.json()["valid"] is True
        assert verify_res.json()["role"] == "store_staff"

        # Logout
        logout_res = await client.post(f"/api/v1/auth/logout?token={token}")
        assert logout_res.status_code == 200

        # Verify after logout
        verify_after = await client.get(f"/api/v1/auth/verify-token?token={token}")
        assert verify_after.status_code == 200
        assert verify_after.json()["valid"] is False


@pytest.mark.asyncio
async def test_staff_kiosk_verify_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"pin": "5521", "device_id": "KIOSK-01"}
        res = await client.post("/api/v1/auth/staff-kiosk-verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["authenticated"] is True
        assert data["role"] == "kiosk_device"
        assert "token" in data
        assert data["expires_in_seconds"] == 86400


@pytest.mark.asyncio
async def test_staff_kiosk_verify_invalid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"pin": "9999", "device_id": "KIOSK-01"}
        res = await client.post("/api/v1/auth/staff-kiosk-verify", json=payload)
        assert res.status_code == 401
        assert "Incorrect Showroom Staff PIN" in res.json()["detail"]
