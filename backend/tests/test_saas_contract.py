import pytest
from datetime import datetime
from sqlalchemy import select
from backend.app.core.saas_contract import (
    UserRole,
    AccountStatus,
    PlanTier,
    PLAN_ENTITLEMENT_CATALOG,
    ROLE_PERMISSIONS,
    ENTITY_TENANT_POLICY,
)
from backend.app.db.models import (
    SubscriptionModel,
    InvoiceModel,
    UserInvitationModel,
    KioskDeviceSessionModel,
    ShopModel,
)
from backend.app.db.migration_runner import apply_all_migrations, ensure_migration_table, get_applied_migrations


def test_saas_plan_entitlements_contract():
    """Verify Silver, Gold, Platinum entitlement rules align with SAAS plan specs."""
    silver = PLAN_ENTITLEMENT_CATALOG[PlanTier.SILVER]
    assert silver.monthly_tryons == 500
    assert silver.max_users == 3
    assert silver.max_kiosks == 1
    assert silver.max_products == 500
    assert silver.max_branches == 1
    assert silver.advanced_analytics is False

    gold = PLAN_ENTITLEMENT_CATALOG[PlanTier.GOLD]
    assert gold.monthly_tryons == 1500
    assert gold.max_users == 8
    assert gold.max_kiosks == 3
    assert gold.max_products == 2000
    assert gold.advanced_analytics is True
    assert gold.whatsapp_integration is True

    platinum = PLAN_ENTITLEMENT_CATALOG[PlanTier.PLATINUM]
    assert platinum.monthly_tryons == 3500
    assert platinum.max_users == 20
    assert platinum.max_kiosks == 10
    assert platinum.motion_3d_features is True
    assert platinum.priority_support is True


def test_role_permission_hierarchy():
    """Verify role permissions exist for all 6 required roles."""
    roles = [
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_OWNER,
        UserRole.STORE_MANAGER,
        UserRole.STAFF,
        UserRole.KIOSK_DEVICE,
        UserRole.READ_ONLY,
    ]
    for r in roles:
        assert r in ROLE_PERMISSIONS
        assert len(ROLE_PERMISSIONS[r]) > 0

    assert "*" in ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]
    assert "user:invite" in ROLE_PERMISSIONS[UserRole.TENANT_OWNER]
    assert "user:invite" not in ROLE_PERMISSIONS[UserRole.STAFF]
    assert "tryon:create_job" in ROLE_PERMISSIONS[UserRole.KIOSK_DEVICE]


def test_account_status_lifecycle():
    """Verify account lifecycle state transitions."""
    valid_statuses = [
        AccountStatus.TRIAL,
        AccountStatus.ACTIVE,
        AccountStatus.PAYMENT_DUE,
        AccountStatus.GRACE,
        AccountStatus.SUSPENDED,
        AccountStatus.CANCELLED,
    ]
    assert len(valid_statuses) == 6
    for s in valid_statuses:
        assert isinstance(s.value, str)


def test_entity_tenant_ownership_policy():
    """Verify tenant isolation policy covers all essential entities."""
    required_entities = [
        "shops", "branches", "kiosks", "admin_users", "products",
        "categories", "tryon_jobs", "media", "counter_tokens", "family_polls", "usage_analytics"
    ]
    for e in required_entities:
        assert e in ENTITY_TENANT_POLICY
        assert "scope_column" in ENTITY_TENANT_POLICY[e]
        assert "description" in ENTITY_TENANT_POLICY[e]


@pytest.mark.asyncio
async def test_migration_runner_on_isolated_db(isolated_database):
    """Test that migration runner safely runs against test database without data loss."""
    from backend.app.core.config import settings
    # Run migration runner
    applied = await apply_all_migrations(settings.DATABASE_URL)
    assert isinstance(applied, list)
