import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.pos.pos_service import pos_service
from backend.app.services.notifications.whatsapp_service import (
    whatsapp_service,
    normalize_phone_number,
)
from backend.app.core.system_settings import set_setting


def test_whatsapp_phone_normalization():
    """Validates phone normalization for Indian mobile formats."""
    assert normalize_phone_number("9840123456") == "919840123456"
    assert normalize_phone_number("+91 98401 23456") == "919840123456"
    assert normalize_phone_number("09840123456") == "919840123456"
    assert normalize_phone_number("919840123456") == "919840123456"


@pytest.mark.asyncio
async def test_pos_dispatch_graceful_offline_mode():
    """
    When POS webhook is not configured or disabled,
    tokens are acknowledged and safely queued locally without breaking kiosk flow.
    """
    await set_setting("pos_webhook_enabled", "false")
    res = await pos_service.dispatch_token_to_pos(
        token_code="TK-KAN-1234",
        product_sku="KAN-SILK-001",
        product_name="Kanchipuram Silk Saree",
        price=14999.0,
        rack_location="Rack A-04",
        customer_phone="+91 98401 23456",
        customer_name="Priya",
    )
    assert res["success"] is True
    assert res["synced"] is False
    assert res["mode"] == "local_mock_acknowledged"


@pytest.mark.asyncio
async def test_pos_dispatch_live_webhook_contract():
    """
    When POS webhook is enabled, dispatches structured event with auth header.
    """
    await set_setting("pos_webhook_enabled", "true")
    await set_setting("pos_webhook_url", "https://pos.myboutique.com/api/webhooks/tokens")
    await set_setting("pos_webhook_auth_header", "Bearer test_pos_token_xyz")
    await set_setting("pos_system_type", "tally")

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    captured = []

    async def mock_post(url, json=None, headers=None, **kwargs):
        captured.append({"url": url, "json": json, "headers": headers})
        return mock_resp

    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=mock_post)):
        res = await pos_service.dispatch_token_to_pos(
            token_code="TK-BAN-5678",
            product_sku="BAN-SILK-002",
            product_name="Banarasi Saree",
            price=12500.0,
            rack_location="Rack B-02",
            customer_phone="9840199999",
            customer_name="Ananya",
        )
        assert res["success"] is True
        assert res["synced"] is True

        assert len(captured) == 1
        req = captured[0]
        assert req["url"] == "https://pos.myboutique.com/api/webhooks/tokens"
        assert req["headers"]["Authorization"] == "Bearer test_pos_token_xyz"
        assert req["json"]["event"] == "floor_token_created"
        assert req["json"]["data"]["token_code"] == "TK-BAN-5678"
        assert req["json"]["data"]["sku"] == "BAN-SILK-002"

    # Reset
    await set_setting("pos_webhook_enabled", "false")


@pytest.mark.asyncio
async def test_counter_token_lifecycle(staff_headers):
    """
    Validates end-to-end Counter Token Lifecycle:
    1. Customer creates floor token slip
    2. Staff views tokens
    3. Staff attends and completes token
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create counter token
        create_resp = await client.post(
            "/api/v1/tryon/counter-token",
            json={
                "product_id": "saree_001",
                "customer_phone": "+91 98401 23456",
                "customer_name": "Deepa Sundaram",
                "notes": "Looking for matching blouse piece",
            },
        )
        assert create_resp.status_code == 200
        token_data = create_resp.json()
        assert token_data["success"] is True
        token_id = token_data["token_id"]
        assert "token_code" in token_data
        assert token_data["status"] == "pending"

        # 2. Staff views token list
        list_resp = await client.get("/api/v1/admin/counter-tokens", headers=staff_headers)
        assert list_resp.status_code == 200
        tokens = list_resp.json()
        found = [t for t in tokens if t["id"] == token_id]
        assert len(found) == 1
        assert found[0]["customer_name"] == "Deepa Sundaram"

        # 3. Staff updates status to 'attended'
        att_resp = await client.patch(
            f"/api/v1/admin/counter-tokens/{token_id}",
            json={"status": "attended"},
            headers=staff_headers,
        )
        assert att_resp.status_code == 200
        assert att_resp.json()["status"] == "success"

        # 4. Staff completes the floor conversion
        comp_resp = await client.patch(
            f"/api/v1/admin/counter-tokens/{token_id}",
            json={"status": "completed"},
            headers=staff_headers,
        )
        assert comp_resp.status_code == 200
        assert comp_resp.json()["status"] == "success"
