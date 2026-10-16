import io
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


def create_dummy_jpeg() -> bytes:
    img = Image.new("RGB", (200, 300), color=(180, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_tryon_consent_rejected():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        image_bytes = create_dummy_jpeg()
        response = await client.post(
            "/api/v1/tryon",
            data={"saree_id": "saree_001", "consent_confirmed": "false", "language": "ta"},
            files={"person_image": ("customer.jpg", image_bytes, "image/jpeg")},
        )
        assert response.status_code == 400
        assert "consent" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tryon_invalid_media_type():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/tryon",
            data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "en"},
            files={"person_image": ("malicious.txt", b"plain text", "text/plain")},
        )
        assert response.status_code == 415


@pytest.mark.asyncio
async def test_tryon_success_and_qr_download():
    from unittest.mock import patch
    from backend.app.services.tryon.mock_engine import MockTryOnEngine

    with patch("backend.app.api.v1.endpoints.tryon.get_tryon_engine", return_value=MockTryOnEngine()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            image_bytes = create_dummy_jpeg()
            response = await client.post(
                "/api/v1/tryon",
                data={"saree_id": "saree_001", "consent_confirmed": "true", "language": "ta"},
                files={"person_image": ("customer.jpg", image_bytes, "image/jpeg")},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"
            assert "job_id" in data
            assert "download_token" in data
            assert "qr_download_url" in data

            # Test download using secure QR token
            token = data["download_token"]
            download_resp = await client.get(f"/api/v1/tryon/download/{token}")
            assert download_resp.status_code == 200
            assert download_resp.headers["content-type"] == "image/jpeg"
            assert len(download_resp.content) > 0



@pytest.mark.asyncio
async def test_validate_pose_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        image_bytes = create_dummy_jpeg()
        response = await client.post(
            "/api/v1/tryon/validate-pose",
            files={"person_image": ("camera_test.jpg", image_bytes, "image/jpeg")},
            data={"language": "ta"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_valid" in data
        assert "pose_score" in data
        assert "green_tick" in data
        assert "guidance_message_ta" in data
        assert "guidance_message_en" in data


@pytest.mark.asyncio
async def test_tryon_custom_garment_success():
    from unittest.mock import patch
    from backend.app.services.tryon.mock_engine import MockTryOnEngine

    with patch("backend.app.api.v1.endpoints.tryon.get_tryon_engine", return_value=MockTryOnEngine()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            person_bytes = create_dummy_jpeg()
            custom_garment_bytes = create_dummy_jpeg()
            response = await client.post(
                "/api/v1/tryon",
                data={"consent_confirmed": "true", "language": "en"},
                files={
                    "person_image": ("customer.jpg", person_bytes, "image/jpeg"),
                    "garment_image": ("custom_shirt.jpg", custom_garment_bytes, "image/jpeg"),
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"
            assert "job_id" in data
            assert "download_token" in data
            assert "qr_download_url" in data


@pytest.mark.asyncio
async def test_tryon_custom_garment_invalid_media_type():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        person_bytes = create_dummy_jpeg()
        response = await client.post(
            "/api/v1/tryon",
            data={"consent_confirmed": "true", "language": "ta"},
            files={
                "person_image": ("customer.jpg", person_bytes, "image/jpeg"),
                "garment_image": ("invalid.txt", b"not an image", "text/plain"),
            },
        )
        assert response.status_code == 415
        assert "garment" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tryon_missing_both_saree_and_garment():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        person_bytes = create_dummy_jpeg()
        response = await client.post(
            "/api/v1/tryon",
            data={"consent_confirmed": "true", "language": "ta"},
            files={"person_image": ("customer.jpg", person_bytes, "image/jpeg")},
        )
        assert response.status_code == 400
        assert "either saree_id or garment_image" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_today_lookbook_feed():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/tryon/today-feed")
        assert res.status_code == 200
        feed = res.json()
        assert isinstance(feed, list)
        assert len(feed) > 0
        assert "job_id" in feed[0]
        assert "saree_name_en" in feed[0]
        assert "result_image_url" in feed[0]


