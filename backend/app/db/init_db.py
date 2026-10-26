import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from backend.app.db.session import engine, Base, AsyncSessionLocal
from backend.app.db.models import (
    ShopModel,
    BranchModel,
    KioskModel,
    CategoryModel,
    ProductModel,
    ProductImageModel,
    AdminUserModel,
    CounterTokenModel,
    FamilyPollModel,
    FamilyPollVoteModel,
)
from backend.app.api.v1.endpoints.catalog import SAMPLE_SAREES


CATEGORIES_SEED = [
    {
        "id": "cat_bridal_silk",
        "name_en": "Bridal Silk",
        "name_ta": "முகூர்த்த பட்டு",
        "slug": "bridal-silk",
        "display_order": 1,
    },
    {
        "id": "cat_banarasi_silk",
        "name_en": "Banarasi Silk",
        "name_ta": "பனாரசி பட்டு",
        "slug": "banarasi-silk",
        "display_order": 2,
    },
    {
        "id": "cat_cotton",
        "name_en": "Cotton Sarees",
        "name_ta": "காட்டன் புடவைகள்",
        "slug": "cotton-sarees",
        "display_order": 3,
    },
    {
        "id": "cat_mysore_silk",
        "name_en": "Mysore Silk",
        "name_ta": "மைசூர் சில்க்",
        "slug": "mysore-silk",
        "display_order": 4,
    },
    {
        "id": "cat_women_chudi",
        "name_en": "Chudidhar",
        "name_ta": "சுடிதார்",
        "slug": "chudidhar",
        "display_order": 5,
    },
    {
        "id": "cat_men_dhoti",
        "name_en": "Men Dhoti",
        "name_ta": "பட்டு வேட்டி",
        "slug": "men-dhoti",
        "display_order": 6,
    },
    {
        "id": "cat_men_kurta",
        "name_en": "Men Kurta & Shirts",
        "name_ta": "சட்டை & குர்தா",
        "slug": "men-kurta",
        "display_order": 7,
    },
    {
        "id": "cat_kids",
        "name_en": "Kids Wear",
        "name_ta": "குழந்தைகள் ஆடை",
        "slug": "kids-wear",
        "display_order": 8,
    },
]


def resolve_category_id(category_name: str) -> str:
    cat_lower = category_name.lower()
    if "banarasi" in cat_lower:
        return "cat_banarasi_silk"
    elif "bridal" in cat_lower or "silk" in cat_lower and "mysore" not in cat_lower:
        return "cat_bridal_silk"
    elif "cotton" in cat_lower:
        return "cat_cotton"
    elif "mysore" in cat_lower:
        return "cat_mysore_silk"
    elif "dhoti" in cat_lower:
        return "cat_men_dhoti"
    elif "kurta" in cat_lower or "shirt" in cat_lower or "suit" in cat_lower:
        return "cat_men_kurta"
    elif "kids" in cat_lower or "pavadai" in cat_lower:
        return "cat_kids"
    elif "chudi" in cat_lower:
        return "cat_women_chudi"
    return "cat_bridal_silk"


async def migrate_db_columns(conn):
    """Safely adds missing columns to PostgreSQL or SQLite database without dropping tables."""
    from sqlalchemy import text
    dialect = conn.dialect.name
    print(f"Applying database schema migrations for dialect: {dialect}...")

    if "postgres" in dialect:
        queries = [
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50)",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) DEFAULT 'silver'",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_price_inr FLOAT DEFAULT 9999.0",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS monthly_token_quota INTEGER DEFAULT 500",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS tokens_used_this_month INTEGER DEFAULT 0",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'paid'",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly'",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS api_key VARCHAR(128)",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS catalog_feed_url VARCHAR(500)",
            "ALTER TABLE shops ADD COLUMN IF NOT EXISTS last_catalog_sync_at TIMESTAMP",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS rack_location VARCHAR(100) DEFAULT 'Section A - Rack 04'",
            "ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS shop_id VARCHAR(64)",
            "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS shop_id VARCHAR(64)",
        ]
        for q in queries:
            try:
                await conn.execute(text(q))
            except Exception as e:
                print(f"Migration note for '{q}': {e}")
    else:
        # SQLite
        try:
            res = await conn.execute(text("PRAGMA table_info(shops)"))
            cols = [row[1] for row in res.fetchall()]
            if cols:
                if "contact_person" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN contact_person VARCHAR(255)"))
                if "contact_email" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN contact_email VARCHAR(255)"))
                if "contact_phone" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN contact_phone VARCHAR(50)"))
                if "is_active" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                if "plan_tier" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN plan_tier VARCHAR(50) DEFAULT 'silver'"))
                if "subscription_price_inr" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN subscription_price_inr FLOAT DEFAULT 9999.0"))
                if "monthly_token_quota" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN monthly_token_quota INTEGER DEFAULT 500"))
                if "tokens_used_this_month" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN tokens_used_this_month INTEGER DEFAULT 0"))
                if "payment_status" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN payment_status VARCHAR(50) DEFAULT 'paid'"))
                if "billing_cycle" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN billing_cycle VARCHAR(50) DEFAULT 'monthly'"))
                if "api_key" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN api_key VARCHAR(128)"))
                if "catalog_feed_url" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN catalog_feed_url VARCHAR(500)"))
                if "last_catalog_sync_at" not in cols:
                    await conn.execute(text("ALTER TABLE shops ADD COLUMN last_catalog_sync_at DATETIME"))

            res_p = await conn.execute(text("PRAGMA table_info(products)"))
            cols_p = [row[1] for row in res_p.fetchall()]
            if cols_p and "rack_location" not in cols_p:
                await conn.execute(text("ALTER TABLE products ADD COLUMN rack_location VARCHAR(100) DEFAULT 'Section A - Rack 04'"))

            res_jobs = await conn.execute(text("PRAGMA table_info(tryon_jobs)"))
            cols_jobs = [row[1] for row in res_jobs.fetchall()]
            if cols_jobs and "shop_id" not in cols_jobs:
                await conn.execute(text("ALTER TABLE tryon_jobs ADD COLUMN shop_id VARCHAR(64)"))

            res_users = await conn.execute(text("PRAGMA table_info(admin_users)"))
            cols_users = [row[1] for row in res_users.fetchall()]
            if cols_users and "shop_id" not in cols_users:
                await conn.execute(text("ALTER TABLE admin_users ADD COLUMN shop_id VARCHAR(64)"))
        except Exception as e:
            print(f"SQLite migration note: {e}")


async def init_database():
    print("Initializing Database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await migrate_db_columns(conn)
    print("Database tables created & migrated successfully.")

    async with AsyncSessionLocal() as session:
        # 1. Seed Flagship Boutique Showroom
        res_s = await session.execute(select(ShopModel).where(ShopModel.id == "shop_default"))
        shop_obj = res_s.scalar_one_or_none()
        if not shop_obj:
            shop_obj = ShopModel(
                id="shop_default",
                name="NeXooAi Luxury Silks",
                slug="nexooai-silks",
                logo_url="/assets/branding/logo.png",
                contact_person="Store Head",
                contact_email="manager@nexooai.in",
                contact_phone="+91 98401 23456",
                is_active=True,
                plan_tier="platinum",
                subscription_price_inr=49999.0,
                monthly_token_quota=3500,
                tokens_used_this_month=48,
                payment_status="paid",
                billing_cycle="monthly",
                api_key="sk_live_nexooai_default_01",
                created_at=datetime.utcnow(),
            )
            session.add(shop_obj)
            print(f"Seeded Flagship Showroom: {shop_obj.name}")
        else:
            if not getattr(shop_obj, "api_key", None):
                shop_obj.api_key = "sk_live_nexooai_default_01"
                shop_obj.plan_tier = "platinum"
                shop_obj.subscription_price_inr = 49999.0
                shop_obj.monthly_token_quota = 3500
                shop_obj.payment_status = "paid"
        await session.flush()

        # 2. Seed Branch
        res = await session.execute(select(BranchModel).where(BranchModel.id == "branch_tnagar"))
        branch = res.scalar_one_or_none()
        if not branch:
            branch = BranchModel(
                id="branch_tnagar",
                shop_id="shop_default",
                branch_name="T. Nagar Flagship Showroom",
                city="Chennai",
                address="Usman Road, T. Nagar, Chennai - 600017",
                phone="+91 44 2434 5678",
                created_at=datetime.utcnow(),
            )
            session.add(branch)
            await session.flush()
            print("Seeded default branch: T. Nagar Flagship Showroom")

        # 3. Seed Kiosk
        res = await session.execute(select(KioskModel).where(KioskModel.kiosk_code == "KIOSK-TN-CHN-01"))
        kiosk = res.scalar_one_or_none()
        if not kiosk:
            kiosk = KioskModel(
                id="kiosk_tn_01",
                branch_id="branch_tnagar",
                kiosk_code="KIOSK-TN-CHN-01",
                display_name='Ground Floor 55" Portrait Totem Mirror',
                status="online",
                device_ip="192.168.1.101",
                last_ping_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
            session.add(kiosk)
            await session.flush()
            print("Seeded default kiosk: KIOSK-TN-CHN-01")

        # 4. Seed Super Admin User (mohandass@nexooai.in)
        from backend.app.core.security import hash_password

        res_master = await session.execute(select(AdminUserModel).where(AdminUserModel.email == "mohandass@nexooai.in"))
        master_user = res_master.scalar_one_or_none()
        if not master_user:
            master_user = AdminUserModel(
                id="admin_master_01",
                email="mohandass@nexooai.in",
                name="Mohandass (NeXooAi Super Admin)",
                hashed_password=hash_password("mohandass@1992"),
                role="super_admin",
                is_active=True,
                created_at=datetime.utcnow(),
            )
            session.add(master_user)
            await session.flush()
            print("Seeded Master Super Admin: mohandass@nexooai.in")
        else:
            # Ensure password matches user's specified credential
            master_user.hashed_password = hash_password("mohandass@1992")
            await session.flush()

        # 4b. Seed Store Manager
        res = await session.execute(select(AdminUserModel).where(AdminUserModel.email == "admin@nexooai.com"))
        admin_user = res.scalar_one_or_none()
        if not admin_user:
            admin_user = AdminUserModel(
                id="admin_001",
                email="admin@nexooai.com",
                name="Showroom Store Manager",
                hashed_password=hash_password("Qwerty@123"),
                role="store_manager",
                is_active=True,
                created_at=datetime.utcnow(),
            )
            session.add(admin_user)
            await session.flush()
            print("Seeded store manager user: admin@nexooai.com")

        # Mock category & product seeding completely disabled.
        # User will upload production sarees & categories directly from Admin portal.
        print("Catalogue initialized in clean state (no mock data).")

        # Ensure a fallback custom product exists for custom garment try-ons
        res_custom = await session.execute(select(ProductModel).where(ProductModel.id == "custom_product"))
        if not res_custom.scalar_one_or_none():
            custom_prod = ProductModel(
                id="custom_product",
                category_id=None,
                sku="CUSTOM-01",
                name_en="Custom Showroom Product",
                name_ta="தனிப்பயன் ஷோரூம் ஆடை",
                category="Custom",
                fabric="Custom Fabric",
                color="Showroom Piece",
                price=0.0,
                description_en="Custom photo uploaded or captured at kiosk",
                description_ta="கியோஸ்க்கில் பதிவேற்றப்பட்ட தனிப்பயன் ஆடை",
                primary_image_url="/static/sarees/kanchipuram_red.jpg",
                pallu_type="Custom",
                is_active=False,
                created_at=datetime.utcnow(),
            )
            session.add(custom_prod)

        await session.commit()
        print(f"Database successfully synchronized with {len(SAMPLE_SAREES)} products.")


if __name__ == "__main__":
    asyncio.run(init_database())
