import pytest
from datetime import datetime, timedelta, timezone
from backend.app.services.tokens.token_service import TokenService
from backend.app.services.storage.local_storage import LocalStorageService


@pytest.mark.asyncio
async def test_token_creation_and_validation():
    service = TokenService(expiry_minutes=30)
    meta = service.create_download_token(job_id="job_abc", max_downloads=2)

    assert meta.raw_token.startswith("tok_")
    assert meta.download_count == 0

    # 1st consume
    validated = service.validate_and_consume_token(meta.raw_token)
    assert validated is not None
    assert validated.download_count == 1

    # 2nd consume
    validated_2 = service.validate_and_consume_token(meta.raw_token)
    assert validated_2 is not None
    assert validated_2.download_count == 2

    # 3rd consume should be rejected (max 2 downloads)
    validated_3 = service.validate_and_consume_token(meta.raw_token)
    assert validated_3 is None


@pytest.mark.asyncio
async def test_token_expiration():
    service = TokenService(expiry_minutes=-10)  # already expired
    meta = service.create_download_token(job_id="job_exp")

    # Should fail validation
    assert service.validate_and_consume_token(meta.raw_token) is None


@pytest.mark.asyncio
async def test_storage_and_retention_purge(tmp_path):
    storage = LocalStorageService(base_dir=str(tmp_path))

    # Save active media
    active_media = await storage.save_media("active_01", b"active_bytes", retention_hours=24)
    data = await storage.get_media("active_01")
    assert data == b"active_bytes"

    # Save expired media
    expired_media = await storage.save_media("exp_01", b"expired_bytes", retention_hours=-1)

    # Purge expired media
    purged = await storage.purge_expired()
    assert purged >= 1

    # Active media should remain
    assert await storage.get_media("active_01") == b"active_bytes"
    # Expired media should be gone
    assert await storage.get_media("exp_01") is None
