"""
NeXooAi — SQLite to PostgreSQL Migration Helper Script
Automatically copies all existing tables, 42+ products, categories, shops, and kiosks
from local SQLite (nexooai_dev.sqlite3) into PostgreSQL!
"""
import sys
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from backend.app.db.models import (
    Base,
    ShopModel,
    BranchModel,
    KioskModel,
    CategoryModel,
    ProductModel,
    ProductImageModel,
    AdminUserModel,
    TryOnSessionModel,
    TryOnJobModel,
    ConsentAuditModel,
    DownloadTokenModel,
)

SQLITE_URL = "sqlite+aiosqlite:///./nexooai_dev.sqlite3"

async def migrate(postgres_url: str):
    print("=" * 65)
    print("  NeXooAi: SQLite -> PostgreSQL Migration")
    print("=" * 65)
    print(f"Source (SQLite)    : {SQLITE_URL}")
    print(f"Target (PostgreSQL): {postgres_url}")
    print("-" * 65)

    sqlite_engine = create_async_engine(SQLITE_URL, echo=False)
    pg_engine = create_async_engine(postgres_url, echo=False)

    SqliteSession = async_sessionmaker(sqlite_engine, class_=AsyncSession, expire_on_commit=False)
    PgSession = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)

    # 1. Create all schema tables in PostgreSQL
    print("[1/5] Creating tables in PostgreSQL...")
    async with pg_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("      Tables created successfully.")

    # 2. Transfer core entities
    models_to_migrate = [
        (ShopModel, "Shops"),
        (BranchModel, "Branches"),
        (KioskModel, "Kiosks"),
        (CategoryModel, "Categories"),
        (ProductModel, "Products"),
        (ProductImageModel, "Product Images"),
        (AdminUserModel, "Admin Users"),
        (TryOnSessionModel, "TryOn Sessions"),
        (TryOnJobModel, "TryOn Jobs"),
        (ConsentAuditModel, "Consent Audits"),
        (DownloadTokenModel, "Download Tokens"),
    ]

    async with SqliteSession() as src_db, PgSession() as dest_db:
        for model_cls, label in models_to_migrate:
            res = await src_db.execute(select(model_cls))
            rows = res.scalars().all()
            print(f"[2/5] Migrating {label}: found {len(rows)} records in SQLite...")
            for r in rows:
                src_data = {col.name: getattr(r, col.name) for col in model_cls.__table__.columns}
                pk_col = list(model_cls.__table__.primary_key.columns)[0]
                check = await dest_db.execute(select(model_cls).where(pk_col == src_data[pk_col.name]))
                if not check.scalar_one_or_none():
                    dest_db.add(model_cls(**src_data))
            await dest_db.commit()

            # Ensure KIOSK-TN-CHN-01 alias exists in destination kiosks to satisfy session FKs
            if model_cls == KioskModel:
                alias_check = await dest_db.execute(select(KioskModel).where(KioskModel.id == "KIOSK-TN-CHN-01"))
                if not alias_check.scalar_one_or_none():
                    dest_db.add(
                        KioskModel(
                            id="KIOSK-TN-CHN-01",
                            branch_id="branch_tnagar",
                            kiosk_code="KIOSK-ALIAS-01",
                            display_name="Ground Floor 55\" Portrait Totem Mirror",
                            status="online",
                        )
                    )
                    await dest_db.commit()

    print("=" * 65)
    print("MIGRATION COMPLETED SUCCESSFULLY!")
    print("You can now update .env with:")
    print(f"DATABASE_URL={postgres_url}")
    print("=" * 65)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/migrate_sqlite_to_postgres.py postgresql+asyncpg://postgres:PASSWORD@localhost:5432/nexooai")
        sys.exit(1)
    target_pg = sys.argv[1]
    asyncio.run(migrate(target_pg))
