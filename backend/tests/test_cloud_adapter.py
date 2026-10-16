import pytest
import base64
from unittest.mock import patch, AsyncMock, MagicMock
import httpx

from backend.app.services.tryon.cloud_engine import CloudApiTryOnEngine
from backend.app.services.tryon.factory import get_tryon_engine
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_cloud_adapter_missing_credentials():
    engine = CloudApiTryOnEngine(provider_name="fal-fashn", api_key="", api_url="")
    result = await engine.process_tryon(b"dummy_person", b"dummy_saree")

    assert result.status == "failed"
    assert result.error_code == "PROVIDER_CREDENTIALS_MISSING"


@pytest.mark.asyncio
async def test_fal_fashn_payload_and_success_with_image_url():
    secret_key = "fal_secret_test_key_xyz123"
    engine = CloudApiTryOnEngine(
        provider_name="fal-fashn",
        api_key=secret_key,
        api_url="https://fal.run/fal-ai/fashn/tryon/v1.6",
    )

    mock_run_response = MagicMock()
    mock_run_response.status_code = 200
    mock_run_response.json.return_value = {
        "request_id": "fashn_req_998877",
        "images": [{"url": "https://fal.media/results/fashn_saree.jpg", "width": 864, "height": 1296}],
    }

    mock_img_response = MagicMock()
    mock_img_response.status_code = 200
    mock_img_response.content = b"fake_fashn_jpeg_bytes"

    captured_requests = []

    async def mock_post(url, json=None, headers=None, **kwargs):
        captured_requests.append({"url": url, "json": json, "headers": headers})
        return mock_run_response

    async def mock_get(url, **kwargs):
        return mock_img_response

    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=mock_post)), \
         patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=mock_get)):

        result = await engine.process_tryon(
            b"test_person_portrait",
            b"test_saree_texture",
            options={"category": "Bridal Silk", "name_en": "Kanchipuram Silk Saree"},
        )

        assert result.status == "completed"
        assert result.provider_name == "fal-fashn"
        assert result.provider_job_id == "fashn_req_998877"
        assert result.result_image_bytes == b"fake_fashn_jpeg_bytes"
        assert result.estimated_cost_usd == 0.075

        # Verify request contract
        assert len(captured_requests) == 1
        req = captured_requests[0]
        assert req["url"] == "https://fal.run/fal-ai/fashn/tryon/v1.6"
        assert req["headers"]["Authorization"] == f"Key {secret_key}"
        assert "model_image" in req["json"]
        assert "garment_image" in req["json"]
        assert req["json"]["category"] == "one-pieces"  # Saree auto-mapped to full-body one-pieces
        assert req["json"]["model_image"].startswith("data:image/jpeg;base64,")


@pytest.mark.asyncio
async def test_fal_kolors_payload_and_success_with_image_dict():
    secret_key = "fal_secret_test_key_kolors"
    engine = CloudApiTryOnEngine(
        provider_name="fal-kolors",
        api_key=secret_key,
        api_url="https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on",
    )

    mock_run_response = MagicMock()
    mock_run_response.status_code = 200
    mock_run_response.json.return_value = {
        "request_id": "kolors_req_112233",
        "image": {"url": "https://fal.media/results/kolors_output.jpg"},
    }

    mock_img_response = MagicMock()
    mock_img_response.status_code = 200
    mock_img_response.content = b"fake_kolors_jpeg_bytes"

    captured_requests = []

    async def mock_post(url, json=None, headers=None, **kwargs):
        captured_requests.append({"url": url, "json": json, "headers": headers})
        return mock_run_response

    async def mock_get(url, **kwargs):
        return mock_img_response

    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=mock_post)), \
         patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=mock_get)):

        result = await engine.process_tryon(
            b"test_person_portrait",
            b"test_garment_swatch",
            options={"category": "Men Shirts", "name_en": "Indigo Chambray Cotton Shirt"},
        )

        assert result.status == "completed"
        assert result.provider_name == "fal-kolors"
        assert result.provider_job_id == "kolors_req_112233"
        assert result.result_image_bytes == b"fake_kolors_jpeg_bytes"
        assert result.estimated_cost_usd == 0.070

        # Verify Kling Kolors payload contract (human_image_url and garment_image_url)
        assert len(captured_requests) == 1
        req = captured_requests[0]
        assert req["url"] == "https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on"
        assert req["headers"]["Authorization"] == f"Key {secret_key}"
        assert "human_image_url" in req["json"]
        assert "garment_image_url" in req["json"]
        assert "model_image" not in req["json"]  # Kolors uses human_image_url


@pytest.mark.asyncio
async def test_fal_fashn_category_mapping():
    engine = CloudApiTryOnEngine(provider_name="fal-fashn", api_key="k", api_url="http://test")

    # Saree -> one-pieces
    p_saree = engine._prepare_payload(b"p", b"g", {"category": "Bridal Silk", "name_en": "Kanchipuram Saree"})
    assert p_saree["category"] == "one-pieces"

    # Shirt -> tops
    p_shirt = engine._prepare_payload(b"p", b"g", {"category": "Men Shirts", "name_en": "Chambray Shirt"})
    assert p_shirt["category"] == "tops"

    # Pants -> bottoms
    p_pant = engine._prepare_payload(b"p", b"g", {"category": "Bottoms", "name_en": "Formal Trousers"})
    assert p_pant["category"] == "bottoms"


@pytest.mark.asyncio
async def test_fal_authentication_error_401():
    secret_key = "super_confidential_key_value"
    engine = CloudApiTryOnEngine(provider_name="fal-fashn", api_key=secret_key, api_url="http://test", max_retries=2)

    mock_resp = MagicMock()
    mock_resp.status_code = 401

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_resp)) as mock_post:
        result = await engine.process_tryon(b"p", b"g")
        assert result.status == "failed"
        assert result.error_code == "PROVIDER_AUTHENTICATION_ERROR"
        # 401 must NOT retry
        assert mock_post.call_count == 1
        # Secret key must NOT be leaked in error message or job id
        assert secret_key not in result.error_message
        assert secret_key not in result.provider_job_id


@pytest.mark.asyncio
async def test_fal_permission_denied_403():
    engine = CloudApiTryOnEngine(provider_name="fal-kolors", api_key="test_key", api_url="http://test", max_retries=2)
    mock_resp = MagicMock()
    mock_resp.status_code = 403

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_resp)) as mock_post:
        result = await engine.process_tryon(b"p", b"g")
        assert result.status == "failed"
        assert result.error_code == "PROVIDER_PERMISSION_DENIED"
        assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_fal_insufficient_credits_402():
    engine = CloudApiTryOnEngine(provider_name="fal-fashn", api_key="test_key", api_url="http://test", max_retries=2)
    mock_resp = MagicMock()
    mock_resp.status_code = 402

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_resp)) as mock_post:
        result = await engine.process_tryon(b"p", b"g")
        assert result.status == "failed"
        assert result.error_code == "PROVIDER_INSUFFICIENT_CREDITS"
        # 402 must NOT retry
        assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_fal_invalid_image_payload_422():
    engine = CloudApiTryOnEngine(provider_name="fal-kolors", api_key="test_key", api_url="http://test", max_retries=2)
    mock_resp = MagicMock()
    mock_resp.status_code = 422

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_resp)) as mock_post:
        result = await engine.process_tryon(b"p", b"g")
        assert result.status == "failed"
        assert result.error_code == "INVALID_IMAGE_PAYLOAD"
        assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_fal_rate_limit_and_retry_429():
    engine = CloudApiTryOnEngine(provider_name="fal-fashn", api_key="test_key", api_url="http://test", max_retries=1)
    mock_resp = MagicMock()
    mock_resp.status_code = 429

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_resp)) as mock_post:
        result = await engine.process_tryon(b"p", b"g")
        assert result.status == "failed"
        assert result.error_code == "PROVIDER_RATE_LIMIT"
        assert mock_post.call_count == 2  # 1 initial + 1 retry


@pytest.mark.asyncio
async def test_fal_timeout():
    engine = CloudApiTryOnEngine(provider_name="fal-kolors", api_key="test_key", api_url="http://test", max_retries=1)

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Timeout connecting")):
        result = await engine.process_tryon(b"p", b"g")
        assert result.status == "failed"
        assert result.error_code == "PROVIDER_TIMEOUT"


@pytest.mark.asyncio
async def test_fal_malformed_response():
    engine = CloudApiTryOnEngine(provider_name="fal-fashn", api_key="test_key", api_url="http://test")

    # 1. Non-JSON response
    mock_non_json = MagicMock()
    mock_non_json.status_code = 200
    mock_non_json.json.side_effect = ValueError("Invalid JSON")

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_non_json)):
        result = await engine.process_tryon(b"p", b"g")
        assert result.status == "failed"
        assert result.error_code == "MALFORMED_PROVIDER_RESPONSE"

    # 2. JSON without image output
    mock_empty_json = MagicMock()
    mock_empty_json.status_code = 200
    mock_empty_json.json.return_value = {"status": "ok", "unexpected": {}}

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_empty_json)):
        result2 = await engine.process_tryon(b"p", b"g")
        assert result2.status == "failed"
        assert result2.error_code == "MALFORMED_PROVIDER_RESPONSE"


def test_factory_provider_selection():
    with patch.object(settings, "AI_TRYON_PROVIDER", "fal-fashn"):
        engine_fashn = get_tryon_engine()
        assert isinstance(engine_fashn, CloudApiTryOnEngine)
        assert engine_fashn.provider_name == "fal-fashn"
        assert engine_fashn.api_url == "https://fal.run/fal-ai/fashn/tryon/v1.6"

    with patch.object(settings, "AI_TRYON_PROVIDER", "fal-kolors"):
        engine_kolors = get_tryon_engine()
        assert isinstance(engine_kolors, CloudApiTryOnEngine)
        assert engine_kolors.provider_name == "fal-kolors"
        assert engine_kolors.api_url == "https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on"
