import asyncio
from backend.app.db.session import AsyncSessionLocal
from sqlalchemy import text


async def main():
    async with AsyncSessionLocal() as session:
        # Reset consent_audits sequence to max(id)
        res = await session.execute(text("SELECT COALESCE(MAX(id), 0) FROM consent_audits"))
        max_id = res.scalar() or 0
        new_val = max(max_id + 1, 1)
        await session.execute(
            text(f"SELECT setval(pg_get_serial_sequence('consent_audits', 'id'), {new_val}, false)")
        )
        await session.commit()
        print(f"consent_audits sequence reset to {new_val}")


if __name__ == "__main__":
    asyncio.run(main())
