import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import ShopModel, KioskModel, TryOnJobModel, ProductModel
import uuid

@pytest.mark.asyncio
async def test_kiosk_crud_and_trial_tracking():
    async with AsyncSessionLocal() as db:
        # Create test boutique
        shop = ShopModel(
            id=f"shop_{uuid.uuid4().hex[:10]}",
            name="Kanchipuram Silk Palace",
            slug=f"kanchipuram-silk-{uuid.uuid4().hex[:4]}",
            plan_tier="PLATINUM",
            subscription_price_inr=49999.0,
            monthly_token_quota=5000,
            city="Kanchipuram",
            address="Gandhi Road, Kanchipuram",
            contact_person="Ramesh Kumar",
            contact_email=f"ramesh_{uuid.uuid4().hex[:6]}@kanchi.in",
            contact_phone="+91 98401 12345",
            is_active=True,
            kiosk_count=0,
            kiosk_password="KanchiKiosk@123",
            kiosk_pin="4455",
        )
        db.add(shop)
        await db.commit()
        await db.refresh(shop)

    # Tokens for super admin and store manager
    super_token = create_access_token(data={"sub": "admin_master", "role": "super_admin", "shop_id": None})
    manager_token = create_access_token(data={"sub": "mgr_01", "role": "store_manager", "shop_id": shop.id})
    headers_sa = {"Authorization": f"Bearer {super_token}"}
    headers_mgr = {"Authorization": f"Bearer {manager_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create Kiosk 1 (Bridal Suite) with custom username & password
        resp1 = await client.post(
            f"/api/v1/admin/customers/{shop.id}/kiosks",
            headers=headers_sa,
            json={
                "display_name": "Bridal Section Smart Mirror",
                "username": "bridal_mirror@kanchi.kiosk",
                "password": "BridalPass@2026",
                "kiosk_pin": "9988",
                "section": "1st Floor Bridal Suite",
                "screen_resolution": "1080x1920 (Portrait 55\")",
            }
        )
        assert resp1.status_code == 200, resp1.text
        k1_data = resp1.json()["kiosk"]
        assert k1_data["display_name"] == "Bridal Section Smart Mirror"
        assert k1_data["username"] == "bridal_mirror@kanchi.kiosk"
        assert k1_data["kiosk_password"] == "BridalPass@2026"
        assert k1_data["kiosk_pin"] == "9988"
        k1_id = k1_data["id"]

        # 2. Create Kiosk 2 (Ground Floor)
        resp2 = await client.post(
            f"/api/v1/admin/customers/{shop.id}/kiosks",
            headers=headers_mgr,
            json={
                "display_name": "Ground Floor Entrance Totem",
                "username": "entrance_mirror@kanchi.kiosk",
                "password": "EntrancePass@2026",
                "kiosk_pin": "4455",
                "section": "Ground Floor Entrance",
            }
        )
        assert resp2.status_code == 200
        k2_data = resp2.json()["kiosk"]
        k2_id = k2_data["id"]

        # 3. List Kiosks for this customer
        list_resp = await client.get(f"/api/v1/admin/customers/{shop.id}/kiosks", headers=headers_mgr)
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert list_data["total_kiosks"] == 2
        assert len(list_data["kiosks"]) == 2

        # 4. Update Kiosk 1
        upd_resp = await client.put(
            f"/api/v1/admin/customers/{shop.id}/kiosks/{k1_id}",
            headers=headers_mgr,
            json={
                "display_name": "Bridal VIP Mirror Deluxe",
                "password": "NewBridalPassword@777",
            }
        )
        assert upd_resp.status_code == 200
        assert upd_resp.json()["kiosk"]["display_name"] == "Bridal VIP Mirror Deluxe"
        assert upd_resp.json()["kiosk"]["kiosk_password"] == "NewBridalPassword@777"

        # 5. Seed a trial job for Kiosk 1 and verify trial tracking
        async with AsyncSessionLocal() as db:
            prod = ProductModel(
                id=f"prod_{uuid.uuid4().hex[:10]}",
                shop_id=shop.id,
                sku=f"KAN-TEST-{uuid.uuid4().hex[:4]}",
                name_en="Gold Zari Kanchipuram Saree",
                name_ta="தங்க ஜரிகை பட்டு",
                category="Kanchipuram Silk",
                price=24999.0,
                primary_image_url="http://test/img.jpg",
                is_active=True,
            )
            db.add(prod)
            await db.commit()

            job = TryOnJobModel(
                id=f"job_{uuid.uuid4().hex[:10]}",
                shop_id=shop.id,
                kiosk_id=k1_id,
                product_id=prod.id,
                status="completed",
                processing_time_ms=1850,
            )
            db.add(job)
            await db.commit()

        # Check list endpoint reflects trial count
        list_resp2 = await client.get(f"/api/v1/admin/customers/{shop.id}/kiosks", headers=headers_sa)
        assert list_resp2.status_code == 200
        kiosks_after = {k["id"]: k for k in list_resp2.json()["kiosks"]}
        assert kiosks_after[k1_id]["trial_count"] == 1
        assert kiosks_after[k2_id]["trial_count"] == 0

        # Check trials history for Kiosk 1
        trials_resp = await client.get(f"/api/v1/admin/customers/{shop.id}/kiosks/{k1_id}/trials", headers=headers_mgr)
        assert trials_resp.status_code == 200
        t_data = trials_resp.json()
        assert t_data["kiosk_id"] == k1_id
        assert len(t_data["trials"]) == 1
        assert t_data["trials"][0]["product_name"] == "Gold Zari Kanchipuram Saree"

        # 6. Delete Kiosk 2
        del_resp = await client.delete(f"/api/v1/admin/customers/{shop.id}/kiosks/{k2_id}", headers=headers_mgr)
        assert del_resp.status_code == 200

        # Verify only 1 kiosk remains
        final_list = await client.get(f"/api/v1/admin/customers/{shop.id}/kiosks", headers=headers_sa)
        assert final_list.status_code == 200
        assert final_list.json()["total_kiosks"] == 1

        # 7. Test fallback resolution when 'shop_default' is passed in the URL (no 404)
        fallback_mgr = await client.get("/api/v1/admin/customers/shop_default/kiosks", headers=headers_mgr)
        assert fallback_mgr.status_code == 200
        assert fallback_mgr.json()["shop_id"] == shop.id

        fallback_sa = await client.get("/api/v1/admin/customers/shop_default/kiosks", headers=headers_sa)
        assert fallback_sa.status_code == 200
        assert "kiosks" in fallback_sa.json()

        # 8. Test Kiosk Authentication using dedicated Username & Password
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "bridal_mirror@kanchi.kiosk",
                "password": "NewBridalPassword@777",
            }
        )
        assert login_resp.status_code == 200, login_resp.text
        login_data = login_resp.json()
        assert login_data["authenticated"] is True
        assert login_data["role"] == "kiosk_terminal"
        assert login_data["kiosk_id"] == k1_id
        assert login_data["shop_id"] == shop.id
        assert "token" in login_data
