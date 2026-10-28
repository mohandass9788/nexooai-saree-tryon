import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_unauthenticated_admin_requests_rejected():
    """Unauthenticated requests to protected /admin/* routes must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # /admin/metrics
        res_metrics = await client.get("/api/v1/admin/metrics")
        assert res_metrics.status_code == 401
        assert "Authentication required" in res_metrics.json()["detail"]

        # /admin/settings
        res_settings = await client.get("/api/v1/admin/settings")
        assert res_settings.status_code == 401

        # /admin/products
        res_products = await client.get("/api/v1/admin/products")
        assert res_products.status_code == 401

        # /admin/customers/today
        res_cust = await client.get("/api/v1/admin/customers/today")
        assert res_cust.status_code == 401


@pytest.mark.asyncio
async def test_sensitive_customer_photo_unauthenticated_rejected():
    """Customer raw portrait photo is PII; unauthenticated requests must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/tryon/jobs/job_test_security_001/customer-photo")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_customer_role_denied_admin_access(customer_headers):
    """Customer role tokens cannot access staff or manager admin endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_products = await client.get("/api/v1/admin/products", headers=customer_headers)
        assert res_products.status_code == 403
        assert "Access denied" in res_products.json()["detail"]

        res_metrics = await client.get("/api/v1/admin/metrics", headers=customer_headers)
        assert res_metrics.status_code == 403


@pytest.mark.asyncio
async def test_store_staff_role_permissions(staff_headers):
    """
    Store staff can access staff-level endpoints (products, counter-tokens, today's customers),
    but are blocked (403) from manager-level (metrics, users) and super-admin (settings, SaaS) endpoints.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Staff can view product list
        res_products = await client.get("/api/v1/admin/products", headers=staff_headers)
        assert res_products.status_code == 200

        # Staff can view today's customers
        res_cust = await client.get("/api/v1/admin/customers/today", headers=staff_headers)
        assert res_cust.status_code == 200

        # Staff cannot view metrics (manager role required)
        res_metrics = await client.get("/api/v1/admin/metrics", headers=staff_headers)
        assert res_metrics.status_code == 403

        # Staff cannot create products (manager role required)
        res_create = await client.post(
            "/api/v1/admin/products",
            json={"sku": "STAFF-NO-01", "name_en": "X", "name_ta": "X", "category": "Silk", "fabric": "Silk", "color": "Red", "price": 100, "primary_image_url": "http://x"},
            headers=staff_headers,
        )
        assert res_create.status_code == 403

        # Staff cannot view platform settings (super_admin required)
        res_settings = await client.get("/api/v1/admin/settings", headers=staff_headers)
        assert res_settings.status_code == 403


@pytest.mark.asyncio
async def test_store_manager_role_permissions(manager_headers):
    """
    Store manager can view metrics, manage products, view users,
    but is blocked (403) from platform super_admin endpoints (settings, SaaS onboard).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Manager can view metrics
        res_metrics = await client.get("/api/v1/admin/metrics", headers=manager_headers)
        assert res_metrics.status_code == 200

        # Manager can view products
        res_products = await client.get("/api/v1/admin/products", headers=manager_headers)
        assert res_products.status_code == 200

        # Manager cannot access platform AI & system settings (super_admin required)
        res_settings = await client.get("/api/v1/admin/settings", headers=manager_headers)
        assert res_settings.status_code == 403

        # Manager cannot list cross-tenant SaaS customers
        res_saas = await client.get("/api/v1/admin/customers", headers=manager_headers)
        assert res_saas.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_role_full_access(super_admin_headers):
    """Super admin has universal access to all admin levels."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_metrics = await client.get("/api/v1/admin/metrics", headers=super_admin_headers)
        assert res_metrics.status_code == 200

        res_products = await client.get("/api/v1/admin/products", headers=super_admin_headers)
        assert res_products.status_code == 200

        res_settings = await client.get("/api/v1/admin/settings", headers=super_admin_headers)
        assert res_settings.status_code == 200


@pytest.mark.asyncio
async def test_public_endpoints_unrestricted():
    """Public customer/kiosk endpoints remain open without requiring auth headers."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_health = await client.get("/api/v1/health")
        assert res_health.status_code == 200

        res_features = await client.get("/api/v1/admin/features-public")
        assert res_features.status_code == 200

        res_catalog = await client.get("/api/v1/catalog")
        assert res_catalog.status_code == 200
