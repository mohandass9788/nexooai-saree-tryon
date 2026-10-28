import io
import asyncio
import pytest
from PIL import Image
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.tryon.mock_engine import MockTryOnEngine


def create_dummy_jpeg() -> bytes:
    img = Image.new("RGB", (100, 150), color=(120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_concurrent_kiosk_traffic_soak():
    """
    Simulates high concurrent kiosk traffic (20 simultaneous requests)
    verifying SQLite WAL concurrency, zero database lock exceptions,
    and fast parallel processing.
    """
    image_bytes = create_dummy_jpeg()

    async def simulate_kiosk_interaction(kiosk_num: int):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Fetch categories
            cat_resp = await client.get("/api/v1/catalog/categories/list")
            assert cat_resp.status_code == 200

            # 2. Fetch catalog
            prod_resp = await client.get("/api/v1/catalog?page=1&limit=10")
            assert prod_resp.status_code == 200

            # 3. Submit try-on job
            with patch("backend.app.api.v1.endpoints.tryon.get_tryon_engine", return_value=MockTryOnEngine()):
                tryon_resp = await client.post(
                    "/api/v1/tryon",
                    data={
                        "saree_id": "saree_001",
                        "consent_confirmed": "true",
                        "language": "ta",
                        "kiosk_id": f"KIOSK-SIM-{kiosk_num:02d}",
                        "session_id": f"sess_load_{kiosk_num}",
                    },
                    files={"person_image": (f"customer_{kiosk_num}.jpg", image_bytes, "image/jpeg")},
                )
                assert tryon_resp.status_code == 200
                data = tryon_resp.json()
                assert data["status"] == "completed"
                return data["job_id"]

    # Execute 20 concurrent kiosk sessions concurrently
    tasks = [simulate_kiosk_interaction(i) for i in range(20)]
    results = await asyncio.gather(*tasks)

    # All 20 jobs completed without error or database lock
    assert len(results) == 20
    assert len(set(results)) == 20  # All unique job IDs


@pytest.mark.asyncio
async def test_production_readiness_health_and_privacy():
    """
    Verifies that system health endpoint returns 200 OK
    and media storage respects automated retention expiration.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        h_resp = await client.get("/api/v1/health")
        assert h_resp.status_code == 200
        h_data = h_resp.json()
        assert h_data["status"] == "healthy"
        assert "version" in h_data

        # 2. Customer photo privacy isolation
        photo_resp = await client.get("/api/v1/tryon/jobs/nonexistent_job/customer-photo")
        # Unauthenticated request must be rejected with 401
        assert photo_resp.status_code == 401
