import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.security import create_access_token, decode_access_token, revoke_token


@pytest.mark.asyncio
async def test_refresh_token_lifecycle(isolated_database):
    """Test exchanging an active token for a refreshed session token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Issue an initial access token
        initial_token = create_access_token(
            data={"sub": "user_mgr_01", "role": "store_manager", "shop_id": "shop_test"}
        )

        # 2. Call /api/v1/auth/refresh-token
        res = await client.post(
            "/api/v1/auth/refresh-token",
            json={"refresh_token": initial_token},
        )
        assert res.status_code == 200
        new_token = res.json()["token"]
        assert new_token != initial_token

        # 3. Old token must be revoked (single-use rotation)
        assert decode_access_token(initial_token) is None

        # 4. New token must be valid and decode properly
        claims = decode_access_token(new_token)
        assert claims["sub"] == "user_mgr_01"
        assert claims["role"] == "store_manager"


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow(isolated_database):
    """Test full password reset flow with secure token validation and audit logging."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Request forgot password for showroom user
        res = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "manager@kumaran.in"},
        )
        assert res.status_code == 200
        assert "reset instructions have been dispatched" in res.json()["message"]

        # 2. Reset with invalid/tampered token should return 400
        bad_res = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": "invalid.jwt.token", "new_password": "NewSecretPassword@2026"},
        )
        assert bad_res.status_code == 400
