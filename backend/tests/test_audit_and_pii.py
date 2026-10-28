import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from backend.app.main import app
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import AuditLogModel, AdminUserModel
from backend.app.core.security import hash_password


@pytest.mark.asyncio
async def test_audit_logs_do_not_leak_passwords_or_tokens(super_admin_headers):
    """
    Verifies that AuditLogModel records do not contain raw passwords or auth tokens.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create a user to generate audit/auth activity
        test_email = "audit_check_user@boutique.in"
        test_pass = "SuperSecretPassword999!"

        async with AsyncSessionLocal() as db:
            user = AdminUserModel(
                id="user_audit_check_01",
                email=test_email,
                name="Audit Tester",
                hashed_password=hash_password(test_pass),
                role="store_staff",
                is_active=True,
            )
            db.add(user)
            await db.commit()

        # Login as this user
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": test_email, "password": test_pass},
        )
        assert login_res.status_code == 200
        token = login_res.json()["token"]

        # Inspect all audit logs in database
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(AuditLogModel))
            logs = res.scalars().all()
            for log in logs:
                details = (log.details or "").lower()
                # Must never contain raw password
                assert test_pass.lower() not in details
                # Must never contain raw JWT token
                assert token.lower() not in details


@pytest.mark.asyncio
async def test_system_settings_keys_masked(super_admin_headers):
    """
    Verifies that system settings endpoints mask sensitive credentials.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Platform Settings
        res_sys = await client.get("/api/v1/admin/settings", headers=super_admin_headers)
        assert res_sys.status_code == 200
        data = res_sys.json()
        assert "fashn_api_key_masked" in data
        assert "gemini_api_key_masked" in data
        assert "openai_api_key_masked" in data
        # Ensure raw keys are not exposed
        assert "fashn_api_key" not in data
        assert "gemini_api_key" not in data

        # 2. Showroom Profile Settings
        res_showroom = await client.get("/api/v1/admin/showroom/settings", headers=super_admin_headers)
        assert res_showroom.status_code == 200
        sr_data = res_showroom.json()
        assert "whatsapp_access_token_masked" in sr_data
        assert "whatsapp_access_token" not in sr_data


@pytest.mark.asyncio
async def test_customer_photo_pii_cannot_be_indexed_publicly():
    """
    Raw customer portraits are PII and must never be exposed publicly without staff auth.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/tryon/jobs/any_random_uuid/customer-photo")
        assert res.status_code == 401
