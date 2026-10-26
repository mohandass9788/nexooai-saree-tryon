import pytest
import asyncio
from backend.app.db.session import engine

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def dispose_engine():
    yield
    await engine.dispose()
