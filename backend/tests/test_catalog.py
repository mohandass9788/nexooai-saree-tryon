import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_get_catalog():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        list_resp = await client.get("/api/v1/catalog")
        assert list_resp.status_code == 200
        data = list_resp.json()
        assert "items" in data
        assert "total" in data
        if len(data["items"]) > 0:
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
        assert "items" in data


@pytest.mark.asyncio
async def test_get_saree_detail(manager_headers):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        list_resp = await client.get("/api/v1/catalog")
        data = list_resp.json()
        if data["total"] == 0:
            import uuid
            cr = await client.post("/api/v1/admin/products", json={
                "sku": f"KAN-TEST-{uuid.uuid4().hex[:6]}",
                "name_en": "Kanchipuram Silk Saree",
                "name_ta": "காஞ்சிபுரம் பட்டு புடவை",
                "category": "Silk Sarees",
                "fabric": "Silk",
                "color": "Crimson Red",
                "price": 12500.0,
                "primary_image_url": "https://example.com/saree.jpg",
                "is_active": True,
            }, headers=manager_headers)
            item_id = cr.json()["id"]
        else:
            item_id = data["items"][0]["id"]

        response = await client.get(f"/api/v1/catalog/{item_id}")
        assert response.status_code == 200
        assert "sku" in response.json()


@pytest.mark.asyncio
async def test_catalog_vector_search():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/catalog/search/similar?query=silk+gold+bridal&limit=3")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_categories_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/catalog/categories/list")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
