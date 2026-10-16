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


async def init_database():
    print("Initializing Database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")

    async with AsyncSessionLocal() as session:
        # 1. Seed Shop
        res = await session.execute(select(ShopModel).where(ShopModel.id == "shop_default"))
        shop = res.scalar_one_or_none()
        if not shop:
            shop = ShopModel(
                id="shop_default",
                name="NeXooAi Silks & Sarees",
                slug="nexooai-silks",
                logo_url="/static/logo.png",
                created_at=datetime.utcnow(),
            )
            session.add(shop)
            await session.flush()
            print("Seeded default shop: NeXooAi Silks & Sarees")

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
                hashed_password=hash_password("Mohan@NeXooAi#2026"),
                role="super_admin",
                is_active=True,
                created_at=datetime.utcnow(),
            )
            session.add(master_user)
            await session.flush()
            print("Seeded Master Super Admin: mohandass@nexooai.in")

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

        # 5. Seed Categories
        for cat_data in CATEGORIES_SEED:
            res = await session.execute(select(CategoryModel).where(CategoryModel.id == cat_data["id"]))
            if not res.scalar_one_or_none():
                category = CategoryModel(
                    id=cat_data["id"],
                    shop_id="shop_default",
                    name_en=cat_data["name_en"],
                    name_ta=cat_data["name_ta"],
                    slug=cat_data["slug"],
                    display_order=cat_data["display_order"],
                    is_active=True,
                    created_at=datetime.utcnow(),
                )
                session.add(category)
        await session.flush()
        print(f"Seeded {len(CATEGORIES_SEED)} garment categories.")

        # 6. Seed Products & Images
        for s in SAMPLE_SAREES:
            res = await session.execute(select(ProductModel).where(ProductModel.id == s.id))
            prod = res.scalar_one_or_none()
            cat_id = resolve_category_id(s.category)
            if not prod:
                prod = ProductModel(
                    id=s.id,
                    category_id=cat_id,
                    sku=s.sku,
                    name_en=s.name_en,
                    name_ta=s.name_ta,
                    category=s.category,
                    fabric=s.fabric,
                    color=s.color,
                    price=s.price,
                    description_en=s.description_en,
                    description_ta=s.description_ta,
                    primary_image_url=s.primary_image_url,
                    pallu_type=s.pallu_type,
                    is_active=s.is_active,
                    created_at=datetime.utcnow(),
                )
                session.add(prod)
                await session.flush()

                # Seed primary image
                prod_img = ProductImageModel(
                    id=f"img_{s.id}",
                    product_id=s.id,
                    image_url=s.primary_image_url,
                    is_primary=True,
                    suitability_status="suitable",
                    created_at=datetime.utcnow(),
                )
                session.add(prod_img)

        # Ensure a fallback custom product exists for custom garment try-ons
        res_custom = await session.execute(select(ProductModel).where(ProductModel.id == "custom_product"))
        if not res_custom.scalar_one_or_none():
            custom_prod = ProductModel(
                id="custom_product",
                category_id="cat_bridal_silk",
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
