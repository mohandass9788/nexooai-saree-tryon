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


@pytest.mark.asyncio
async def test_b2b_boutique_onboard_and_manager_role_isolation(super_admin_headers):
    import uuid
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        unique_suffix = uuid.uuid4().hex[:6]
        manager_email = f"manager_{unique_suffix}@boutique.in"
        password = "SecurePassword123!"

        # 1. Super Admin onboards new boutique client
        onboard_payload = {
            "name": f"Sri Lakshmi Silks {unique_suffix}",
            "contact_person": "Kavitha Murugan",
            "contact_email": manager_email,
            "contact_phone": "+91 98401 99999",
            "password": password,
            "plan_tier": "gold",
            "city": "Coimbatore",
            "address": "Cross Cut Road, Gandhipuram",
        }
        onboard_res = await client.post("/api/v1/admin/customers", json=onboard_payload, headers=super_admin_headers)
        assert onboard_res.status_code == 200
        onboard_data = onboard_res.json()
        assert onboard_data["success"] is True
        assert onboard_data["customer"]["login_email"] == manager_email
        assert "api_key" in onboard_data["customer"]

        # 2. Boutique Manager logs in with their credentials
        login_payload = {
            "email": manager_email,
            "password": password,
        }
        login_res = await client.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["authenticated"] is True
        assert login_data["role"] == "store_manager"
        assert login_data["role"] != "super_admin"
        assert login_data["name"] == "Kavitha Murugan"
        assert "token" in login_data

