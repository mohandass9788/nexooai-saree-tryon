import io
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.main import app
from backend.app.db.session import engine
from backend.app.db.models import ShopModel


def create_dummy_jpeg() -> bytes:
    img = Image.new("RGB", (200, 300), color=(180, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_suspended_tenant_tryon_rejected():
    """Verify that a suspended tenant showroom cannot process try-on jobs (HTTP 403)."""
    async with AsyncSession(engine) as session:
        # Create dedicated suspended shop
        shop = ShopModel(id="shop_test_suspended", name="Suspended Boutique", slug="suspended-boutique", is_active=False, payment_status="suspended")
        session.add(shop)
        try:
            await session.commit()
        except Exception:
            await session.rollback()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        person_bytes = create_dummy_jpeg()
        files = {"person_image": ("person.jpg", person_bytes, "image/jpeg")}
        data = {"saree_id": "sar-001", "consent_confirmed": "true", "shop_id": "shop_test_suspended"}
        res = await client.post("/api/v1/tryon", files=files, data=data)
        assert res.status_code == 403
        assert "temporarily paused due to account status" in res.json()["detail"]


@pytest.mark.asyncio
async def test_quota_exhausted_tenant_tryon_rejected():
    """Verify that an exhausted tenant quota returns HTTP 429 Too Many Requests."""
    async with AsyncSession(engine) as session:
        shop = ShopModel(id="shop_test_quota", name="Quota Boutique", slug="quota-boutique", is_active=True, payment_status="paid", monthly_token_quota=10, tokens_used_this_month=10)
        session.add(shop)
        try:
            await session.commit()
        except Exception:
            await session.rollback()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        person_bytes = create_dummy_jpeg()
        files = {"person_image": ("person.jpg", person_bytes, "image/jpeg")}
        data = {"saree_id": "sar-001", "consent_confirmed": "true", "shop_id": "shop_test_quota"}
        res = await client.post("/api/v1/tryon", files=files, data=data)
        assert res.status_code == 429
        assert "quota" in res.json()["detail"].lower()
