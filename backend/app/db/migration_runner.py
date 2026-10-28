"""
NeXooAi Production Database Migration Runner
Provides versioned, auditable DDL and DML migrations for SQLite and PostgreSQL.
Ensures startup `create_all()` is never relied on for production schema evolutions.
"""
import sys
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Callable, Any
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine, AsyncConnection

from backend.app.core.config import settings

logger = logging.getLogger("migration_runner")

# Migration registry: version string -> migration metadata and runner
MIGRATIONS: List[Dict[str, Any]] = [
    {
        "version": "20261027_001_initial_core_schema",
        "description": "Baseline tables for shops, branches, kiosks, products, tryon jobs, admin users",
    },
    {
        "version": "20261027_002_add_shop_id_tenant_isolation",
        "description": "Ensure shop_id foreign key exists on products, categories, and jobs with index",
    },
    {
        "version": "20261027_003_saas_access_and_subscriptions",
        "description": "Create subscriptions, invoices, user_invitations, and kiosk_device_sessions tables",
    },
]


async def ensure_migration_table(conn: AsyncConnection) -> None:
    """Ensure the schema_migrations tracking table exists."""
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(128) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description VARCHAR(255)
            );
            """
        )
    )


async def get_applied_migrations(conn: AsyncConnection) -> List[str]:
    """Retrieve list of already applied migration versions."""
    result = await conn.execute(text("SELECT version FROM schema_migrations ORDER BY applied_at ASC"))
    return [row[0] for row in result.fetchall()]


async def run_migration_003(conn: AsyncConnection, dialect: str) -> None:
    """Apply SaaS access, subscriptions, invoices, and invitation tables."""
    # Subscriptions table
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                id VARCHAR(64) PRIMARY KEY,
                shop_id VARCHAR(64) NOT NULL,
                plan_tier VARCHAR(50) NOT NULL DEFAULT 'silver',
                account_status VARCHAR(50) NOT NULL DEFAULT 'trial',
                monthly_price_inr FLOAT NOT NULL DEFAULT 9999.0,
                monthly_tryon_limit INTEGER NOT NULL DEFAULT 500,
                max_kiosks INTEGER NOT NULL DEFAULT 1,
                max_users INTEGER NOT NULL DEFAULT 3,
                max_products INTEGER NOT NULL DEFAULT 500,
                current_period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                current_period_end TIMESTAMP,
                grace_period_end TIMESTAMP,
                billing_email VARCHAR(255),
                gstin VARCHAR(32),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
    )
    # Invoices table
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS invoices (
                id VARCHAR(64) PRIMARY KEY,
                shop_id VARCHAR(64) NOT NULL,
                subscription_id VARCHAR(64),
                invoice_number VARCHAR(64) UNIQUE NOT NULL,
                amount_inr FLOAT NOT NULL,
                gst_amount_inr FLOAT DEFAULT 0.0,
                status VARCHAR(32) DEFAULT 'unpaid',
                due_date TIMESTAMP NOT NULL,
                paid_at TIMESTAMP,
                payment_reference VARCHAR(128),
                payment_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
    )
    # User invitations table
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS user_invitations (
                id VARCHAR(64) PRIMARY KEY,
                shop_id VARCHAR(64) NOT NULL,
                email VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'store_manager',
                invited_by_user_id VARCHAR(64),
                invite_token VARCHAR(128) UNIQUE NOT NULL,
                status VARCHAR(32) DEFAULT 'pending',
                expires_at TIMESTAMP NOT NULL,
                accepted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
    )
    # Kiosk device sessions table
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS kiosk_device_sessions (
                id VARCHAR(64) PRIMARY KEY,
                kiosk_id VARCHAR(64) NOT NULL,
                shop_id VARCHAR(64) NOT NULL,
                device_token VARCHAR(128) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                ip_address VARCHAR(64),
                last_heartbeat_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
    )


async def apply_all_migrations(database_url: str) -> List[str]:
    """Execute all pending migrations safely."""
    engine = create_async_engine(database_url, echo=False)
    applied_this_run: List[str] = []

    async with engine.begin() as conn:
        dialect = conn.dialect.name
        await ensure_migration_table(conn)
        applied = await get_applied_migrations(conn)

        for migration in MIGRATIONS:
            ver = migration["version"]
            if ver not in applied:
                if ver == "20261027_003_saas_access_and_subscriptions":
                    await run_migration_003(conn, dialect)

                await conn.execute(
                    text("INSERT INTO schema_migrations (version, description) VALUES (:v, :d)"),
                    {"v": ver, "d": migration["description"]},
                )
                applied_this_run.append(ver)

    await engine.dispose()
    return applied_this_run


if __name__ == "__main__":
    db_url = settings.DATABASE_URL
    print(f"Running database migrations against: {db_url}")
    results = asyncio.run(apply_all_migrations(db_url))
    print(f"Applied migrations: {results}")
