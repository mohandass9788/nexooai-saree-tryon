import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_get_admin_metrics():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/admin/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_tryons_today" in data
        assert "success_rate_percent" in data
        assert "active_catalog_count" in data
        assert "estimated_cost_usd_today" in data
        assert data["success_rate_percent"] > 0


@pytest.mark.asyncio
async def test_admin_list_and_create_product():
    import uuid
    test_sku = f"ADM-TEST-{uuid.uuid4().hex[:6].upper()}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. List products
        list_resp = await client.get("/api/v1/admin/products")
        assert list_resp.status_code == 200
        initial_count = len(list_resp.json())

        # 2. Create product
        new_saree = {
            "sku": test_sku,
            "name_en": "Chanderi Silk Party Saree",
            "name_ta": "சந்தேரி பட்டு பார்ட்டி புடவை",
            "category": "Silk Sarees",
            "fabric": "Chanderi Silk",
            "color": "Pastel Peach",
            "price": 8900.0,
            "primary_image_url": "https://example.com/saree.jpg",
            "pallu_type": "Zari Weave",
        }
        create_resp = await client.post("/api/v1/admin/products", json=new_saree)
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["sku"] == test_sku

        # 3. Duplicate SKU should be rejected
        dup_resp = await client.post("/api/v1/admin/products", json=new_saree)
        assert dup_resp.status_code == 409



@pytest.mark.asyncio
async def test_admin_toggle_product_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        prods = await client.get("/api/v1/admin/products")
        items = prods.json()
        if not items:
            cr = await client.post("/api/v1/admin/products", json={
                "sku": "TOGGLE-TEST-001",
                "name_en": "Test Saree",
                "name_ta": "சோதனை புடவை",
                "category": "Silk",
                "fabric": "Silk",
                "color": "Red",
                "price": 5000.0,
                "primary_image_url": "https://example.com/saree.jpg",
            })
            prod_id = cr.json()["id"]
        else:
            prod_id = items[0]["id"]

        response = await client.put(
            f"/api/v1/admin/products/{prod_id}/status",
            params={"is_active": False},
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is False

        # Reset back to True
        reset_resp = await client.put(
            f"/api/v1/admin/products/{prod_id}/status",
            params={"is_active": True},
        )
        assert reset_resp.status_code == 200

        assert reset_resp.json()["is_active"] is True


@pytest.mark.asyncio
async def test_admin_jobs_and_safe_retry():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # List jobs
        jobs_resp = await client.get("/api/v1/admin/jobs")
        assert jobs_resp.status_code == 200
        jobs = jobs_resp.json()
        assert len(jobs) >= 1

        # Retry failed job (job_4b99ef21)
        retry_resp = await client.post("/api/v1/admin/jobs/job_4b99ef21/retry")
        assert retry_resp.status_code == 200
        retried = retry_resp.json()
        assert retried["status"] == "completed"
        assert retried["retry_count"] >= 1
