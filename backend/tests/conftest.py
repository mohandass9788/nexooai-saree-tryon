import asyncio
import shutil
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy.engine import make_url

from backend.app.core.config import settings
from backend.app.db.session import Base, engine


def pytest_configure(config):
    """Fail closed if the suite is pointed at a non-test database."""
    database_url = settings.DATABASE_URL.lower()
    if settings.APP_ENV != "testing" or "sqlite" not in database_url or "test" not in database_url:
        raise pytest.UsageError(
            "Tests require APP_ENV=testing and a SQLite DATABASE_URL containing 'test'. "
            "Example: DATABASE_URL=sqlite+aiosqlite:///./test.db"
        )

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session", autouse=True)
async def isolated_database():
    """Create a clean schema for the suite and remove it afterwards.

    HTTPX's ASGI transport does not automatically run FastAPI lifespan hooks,
    so tests must not depend on a developer's seeded local database.
    """
    # Import all models before metadata creation; otherwise relationship tables
    # defined in modules not imported by a particular test could be absent.
    import backend.app.db.models  # noqa: F401

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    _remove_test_artifacts()


def _remove_test_artifacts():
    """Remove only test-named SQLite/media artifacts created by this suite."""
    storage_dir = Path(settings.STORAGE_LOCAL_DIR).resolve()
    if "test" in storage_dir.name.lower() and storage_dir.exists():
        shutil.rmtree(storage_dir)

    database_path = make_url(settings.DATABASE_URL).database
    if not database_path:
        return

    sqlite_path = Path(database_path).resolve()
    if "test" not in sqlite_path.name.lower():
        return

    for suffix in ("", "-shm", "-wal"):
        candidate = Path(f"{sqlite_path}{suffix}")
        if candidate.exists():
            candidate.unlink()


@pytest.fixture
def super_admin_token() -> str:
    from backend.app.core.security import create_access_token
    return create_access_token(
        data={
            "sub": "user_super_test",
            "user_id": "user_super_test",
            "role": "super_admin",
            "shop_id": "shop_default",
            "email": "superadmin@nexooai.in",
        }
    )


@pytest.fixture
def super_admin_headers(super_admin_token: str) -> dict:
    return {"Authorization": f"Bearer {super_admin_token}"}


@pytest.fixture
def manager_token() -> str:
    from backend.app.core.security import create_access_token
    return create_access_token(
        data={
            "sub": "user_mgr_test",
            "user_id": "user_mgr_test",
            "role": "store_manager",
            "shop_id": "shop_default",
            "email": "manager@boutique.in",
        }
    )


@pytest.fixture
def manager_headers(manager_token: str) -> dict:
    return {"Authorization": f"Bearer {manager_token}"}


@pytest.fixture
def staff_token() -> str:
    from backend.app.core.security import create_access_token
    return create_access_token(
        data={
            "sub": "user_staff_test",
            "user_id": "user_staff_test",
            "role": "store_staff",
            "shop_id": "shop_default",
            "email": "staff@boutique.in",
        }
    )


@pytest.fixture
def staff_headers(staff_token: str) -> dict:
    return {"Authorization": f"Bearer {staff_token}"}


@pytest.fixture
def customer_token() -> str:
    from backend.app.core.security import create_access_token
    return create_access_token(
        data={
            "sub": "cust_test",
            "user_id": "cust_test",
            "role": "customer",
            "shop_id": "shop_default",
        }
    )


@pytest.fixture
def customer_headers(customer_token: str) -> dict:
    return {"Authorization": f"Bearer {customer_token}"}


@pytest.fixture
def shop_a_headers() -> dict:
    from backend.app.core.security import create_access_token
    token = create_access_token(
        data={
            "sub": "user_mgr_shop_a",
            "user_id": "user_mgr_shop_a",
            "role": "store_manager",
            "shop_id": "shop_a_boutique",
            "email": "mgr_a@boutique.in",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def shop_b_headers() -> dict:
    from backend.app.core.security import create_access_token
    token = create_access_token(
        data={
            "sub": "user_mgr_shop_b",
            "user_id": "user_mgr_shop_b",
            "role": "store_manager",
            "shop_id": "shop_b_boutique",
            "email": "mgr_b@boutique.in",
        }
    )
    return {"Authorization": f"Bearer {token}"}


