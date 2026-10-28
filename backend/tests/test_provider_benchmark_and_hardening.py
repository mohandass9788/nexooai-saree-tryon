import io
import pytest
from PIL import Image
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.tryon.base import TryOnEngineResult
from backend.app.core.system_settings import set_setting


def create_dummy_jpeg() -> bytes:
    img = Image.new("RGB", (200, 300), color=(180, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_idempotency_cache_prevents_duplicate_billing():
    """
    Ensures that identical try-on submissions (e.g. kiosk double-tap)
    within 60s return the cached response, preventing double billing.
    """
    from backend.app.services.tryon.mock_engine import MockTryOnEngine

    engine = MockTryOnEngine()
    with patch("backend.app.api.v1.endpoints.tryon.get_tryon_engine", return_value=engine):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            image_bytes = create_dummy_jpeg()

            # First tap
            resp1 = await client.post(
                "/api/v1/tryon",
                data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "ta", "session_id": "sess_idemp_1"},
                files={"person_image": ("customer.jpg", image_bytes, "image/jpeg")},
            )
            assert resp1.status_code == 200
            data1 = resp1.json()

            # Second tap immediately with same image & saree
            resp2 = await client.post(
                "/api/v1/tryon",
                data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "ta", "session_id": "sess_idemp_1"},
                files={"person_image": ("customer.jpg", image_bytes, "image/jpeg")},
            )
            assert resp2.status_code == 200
            data2 = resp2.json()

            # Same job_id returned without re-running inference
            assert data1["job_id"] == data2["job_id"]
            assert data1["download_token"] == data2["download_token"]


@pytest.mark.asyncio
async def test_daily_cost_cap_enforcement():
    """
    Verifies that when today's spending hits the daily budget cap,
    further try-ons are rejected with HTTP 429 and polite guidance.
    """
    await set_setting("ai_cost_cap_enabled", "true")
    await set_setting("ai_daily_budget_usd", 0.00)  # Set cap to 0 to trigger immediately

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        image_bytes = create_dummy_jpeg()
        resp = await client.post(
            "/api/v1/tryon",
            data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "ta", "session_id": "sess_cap_test"},
            files={"person_image": ("customer.jpg", image_bytes, "image/jpeg")},
        )
        assert resp.status_code == 429
        detail = resp.json()["detail"]
        assert "Daily virtual try-on allocation has been reached" in detail or "ஒதுக்கீடு" in detail

    # Reset budget cap back to 15.0
    await set_setting("ai_daily_budget_usd", 15.0)


@pytest.mark.asyncio
async def test_friendly_retake_path_on_provider_failure():
    """
    Verifies that provider failures return actionable, friendly bilingual guidance.
    """
    from unittest.mock import AsyncMock

    mock_failing_engine = MagicMock()

    # 1. Test timeout failure
    mock_failing_engine.process_tryon = AsyncMock(return_value=TryOnEngineResult(
        status="failed",
        provider_name="fal-fashn",
        provider_job_id="job_timeout_123",
        error_code="PROVIDER_TIMEOUT",
        error_message="Gateway timeout connecting to fal.run",
    ))

    with patch("backend.app.api.v1.endpoints.tryon.get_tryon_engine", return_value=mock_failing_engine):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            image_bytes = create_dummy_jpeg()
            resp = await client.post(
                "/api/v1/tryon",
                data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "ta", "session_id": "sess_fail_1"},
                files={"person_image": ("customer.jpg", image_bytes, "image/jpeg")},
            )
            assert resp.status_code == 502
            detail = resp.json()["detail"]
            assert "Retry" in detail or "மீண்டும் முயற்சி" in detail

    # 2. Test invalid image framing failure
    mock_failing_engine.process_tryon = AsyncMock(return_value=TryOnEngineResult(
        status="failed",
        provider_name="fal-fashn",
        provider_job_id="job_invalid_frame_123",
        error_code="INVALID_IMAGE_PAYLOAD",
        error_message="Face not detected or pose too dark",
    ))

    with patch("backend.app.api.v1.endpoints.tryon.get_tryon_engine", return_value=mock_failing_engine):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            image_bytes = create_dummy_jpeg()
            resp2 = await client.post(
                "/api/v1/tryon",
                data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "ta", "session_id": "sess_fail_2"},
                files={"person_image": ("customer.jpg", image_bytes, "image/jpeg")},
            )
            assert resp2.status_code == 502
            detail2 = resp2.json()["detail"]
            assert "framing" in detail2.lower() or "lighting" in detail2.lower()
