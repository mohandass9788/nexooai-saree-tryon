import io
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from backend.app.core.config import settings
from backend.app.main import app
from backend.app.services.tryon.mock_engine import MockTryOnEngine


def _jpeg_bytes() -> bytes:
    image = Image.new("RGB", (160, 240), color=(180, 100, 100))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_tryon_qr_uses_configured_public_base_url():
    original_base_url = settings.PUBLIC_BASE_URL
    settings.PUBLIC_BASE_URL = "https://tryon.example.in/"
    try:
        with patch(
            "backend.app.api.v1.endpoints.tryon.get_tryon_engine",
            return_value=MockTryOnEngine(),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/tryon",
                    data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "en"},
                    files={"person_image": ("customer.jpg", _jpeg_bytes(), "image/jpeg")},
                )
    finally:
        settings.PUBLIC_BASE_URL = original_base_url

    assert response.status_code == 200
    assert response.json()["result_image_url"].startswith("https://tryon.example.in/api/v1/tryon/jobs/")
    assert response.json()["qr_download_url"].startswith("https://tryon.example.in/api/v1/tryon/download/")
