import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_cross_tenant_product_isolation(shop_a_headers, shop_b_headers, super_admin_headers):
    """
    Ensures that products created by Shop A cannot be viewed, modified, or deleted by Shop B.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Shop A creates a boutique product
        saree_payload = {
            "sku": "SHOPA-SILK-001",
            "name_en": "Shop A Bridal Kanchipuram",
            "name_ta": "ஷாப் ஏ பட்டு புடவை",
            "category": "Bridal Silk",
            "fabric": "Mulberry Silk",
            "color": "Ruby Crimson",
            "price": 28000.0,
            "primary_image_url": "https://example.com/shopa.jpg",
            "pallu_type": "Gold Zari",
        }
        res_create = await client.post("/api/v1/admin/products", json=saree_payload, headers=shop_a_headers)
        assert res_create.status_code == 201
        product_id = res_create.json()["id"]

        # 2. Shop B lists products -> Shop A's product should NOT be in Shop B's catalog
        res_list_b = await client.get("/api/v1/admin/products", headers=shop_b_headers)
        assert res_list_b.status_code == 200
        shop_b_skus = [p["sku"] for p in res_list_b.json()]
        assert "SHOPA-SILK-001" not in shop_b_skus

        # 3. Shop B manager attempts to deactivate Shop A's saree -> 403 Forbidden
        res_toggle_b = await client.put(
            f"/api/v1/admin/products/{product_id}/status",
            params={"is_active": False},
            headers=shop_b_headers,
        )
        assert res_toggle_b.status_code == 403
        assert "Cross-tenant" in res_toggle_b.json()["detail"]

        # 4. Shop B manager attempts to delete Shop A's saree -> 403 Forbidden
        res_del_b = await client.delete(f"/api/v1/admin/products/{product_id}", headers=shop_b_headers)
        assert res_del_b.status_code == 403
        assert "Cross-tenant" in res_del_b.json()["detail"]

        # 5. Shop A manager deactivates own product -> 200 OK
        res_toggle_a = await client.put(
            f"/api/v1/admin/products/{product_id}/status",
            params={"is_active": False},
            headers=shop_a_headers,
        )
        assert res_toggle_a.status_code == 200
        assert res_toggle_a.json()["is_active"] is False

        # 6. Super Admin can view all products including Shop A
        res_super = await client.get("/api/v1/admin/products", headers=super_admin_headers)
        assert res_super.status_code == 200
        super_skus = [p["sku"] for p in res_super.json()]
        assert "SHOPA-SILK-001" in super_skus


@pytest.mark.asyncio
async def test_cross_tenant_scope_tampering_rejected(shop_b_headers):
    """
    Shop B manager cannot tamper with query parameter `?shop_id=shop_a_boutique`.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/admin/metrics?shop_id=shop_a_boutique", headers=shop_b_headers)
        assert res.status_code == 403
        assert "Cross-tenant access denied" in res.json()["detail"]


@pytest.mark.asyncio
async def test_cross_tenant_user_management_isolation(shop_a_headers, shop_b_headers):
    """
    Shop A manager cannot see or delete Shop B's staff accounts.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Shop A creates a staff member
        user_payload = {
            "name": "Shop A Staff 1",
            "email": "staff1@shopa.in",
            "role": "store_staff",
            "password": "SecureStaffPassword123!",
        }
        res_create = await client.post("/api/v1/admin/users", json=user_payload, headers=shop_a_headers)
        assert res_create.status_code == 200
        staff_a_id = res_create.json()["id"]

        # Shop B lists users -> should not see staff1@shopa.in
        res_users_b = await client.get("/api/v1/admin/users", headers=shop_b_headers)
        assert res_users_b.status_code == 200
        shop_b_emails = [u["email"] for u in res_users_b.json()]
        assert "staff1@shopa.in" not in shop_b_emails

        # Shop B tries to delete Shop A's staff -> 403 Forbidden
        res_del_b = await client.delete(f"/api/v1/admin/users/{staff_a_id}", headers=shop_b_headers)
        assert res_del_b.status_code == 403
        assert "Cross-tenant" in res_del_b.json()["detail"]
