import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_get_catalog():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/catalog")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 4
        # Check bilingual fields
        first_item = data["items"][0]
        assert "name_en" in first_item
        assert "name_ta" in first_item
        assert "price" in first_item


@pytest.mark.asyncio
async def test_get_catalog_filtered():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/catalog?category=Silk")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_get_saree_detail():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/catalog/saree_001")
        assert response.status_code == 200
        data = response.json()
        assert data["sku"] == "KAN-SILK-001"


@pytest.mark.asyncio
async def test_catalog_vector_search():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/catalog/search/similar?query=silk+gold+bridal&limit=3")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "similarity_score" in data[0]


@pytest.mark.asyncio
async def test_get_categories_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/catalog/categories/list")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert data["total"] >= 1
        assert "name_en" in data["categories"][0]
        assert "name_ta" in data["categories"][0]


