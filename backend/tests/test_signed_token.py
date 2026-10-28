import time
from datetime import timedelta
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.security import (
    create_access_token,
    decode_access_token,
    revoke_token,
    is_token_revoked,
)


def test_jwt_creation_and_decoding():
    payload_data = {
        "sub": "user_123",
        "role": "store_manager",
        "shop_id": "shop_kanchipuram_01",
        "name": "Kavitha M",
    }
    token = create_access_token(payload_data, expires_delta=timedelta(minutes=15))
    assert isinstance(token, str)
    assert token.count(".") == 2

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == "store_manager"
    assert decoded["shop_id"] == "shop_kanchipuram_01"
    assert decoded["name"] == "Kavitha M"
    assert "exp" in decoded
    assert "iat" in decoded
    assert "jti" in decoded
    assert decoded["exp"] > decoded["iat"]


def test_jwt_tamper_detection():
    payload_data = {"sub": "staff_01", "role": "store_staff"}
    token = create_access_token(payload_data)

    parts = token.split(".")
    # Tamper with signature
    tampered_sig = parts[0] + "." + parts[1] + ".fakeSignature123"
    assert decode_access_token(tampered_sig) is None

    # Tamper with payload
    tampered_payload = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZWQiLCJyb2xlIjoic3VwZXJfYWRtaW4ifQ." + parts[2]
    assert decode_access_token(tampered_payload) is None


def test_jwt_expiration():
    payload_data = {"sub": "staff_02", "role": "store_staff"}
    # Token expired 10 seconds ago
    expired_token = create_access_token(payload_data, expires_delta=timedelta(seconds=-10))
    assert decode_access_token(expired_token) is None


def test_jwt_revocation():
    payload_data = {"sub": "user_456", "role": "store_manager"}
    token = create_access_token(payload_data)
    decoded = decode_access_token(token)
    assert decoded is not None
    jti = decoded["jti"]

    assert not is_token_revoked(jti)
    revoke_token(token)
    assert is_token_revoked(jti)
    assert decode_access_token(token) is None


@pytest.mark.asyncio
async def test_auth_verify_token_via_bearer_header():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Obtain signed token via PIN verify
        login_res = await client.post(
            "/api/v1/auth/kiosk-pin-verify",
            json={"pin": settings.KIOSK_ADMIN_PIN, "kiosk_id": "KIOSK-TN-CHN-01"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        assert token.count(".") == 2  # Verify it's a signed JWT

        # Verify via Authorization Bearer header
        headers = {"Authorization": f"Bearer {token}"}
        verify_res = await client.get("/api/v1/auth/verify-token", headers=headers)
        assert verify_res.status_code == 200
        data = verify_res.json()
        assert data["valid"] is True
        assert data["role"] == "store_staff"

        # Logout via Bearer header
        logout_res = await client.post("/api/v1/auth/logout", headers=headers)
        assert logout_res.status_code == 200

        # Verify again after logout -> should be invalid
        verify_after = await client.get("/api/v1/auth/verify-token", headers=headers)
        assert verify_after.status_code == 200
        assert verify_after.json()["valid"] is False
