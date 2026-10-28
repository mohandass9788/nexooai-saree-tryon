from typing import Dict, Any, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    TENANT_OWNER = "tenant_owner"
    STORE_MANAGER = "store_manager"
    STAFF = "staff"
    KIOSK_DEVICE = "kiosk_device"
    READ_ONLY = "read_only"


class AccountStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAYMENT_DUE = "payment_due"
    GRACE = "grace"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class PlanTier(str, Enum):
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class PlanEntitlements(BaseModel):
    tier: PlanTier
    display_name: str
    monthly_tryons: int
    max_users: int
    max_kiosks: int
    max_products: int
    max_branches: int
    basic_analytics: bool = True
    advanced_analytics: bool = False
    whatsapp_integration: bool = False
    family_poll: bool = False
    motion_3d_features: bool = False
    priority_support: bool = False


# Canonical SaaS Plan Entitlement Contract
PLAN_ENTITLEMENT_CATALOG: Dict[PlanTier, PlanEntitlements] = {
    PlanTier.SILVER: PlanEntitlements(
        tier=PlanTier.SILVER,
        display_name="Silver Showroom Starter",
        monthly_tryons=500,
        max_users=3,
        max_kiosks=1,
        max_products=500,
        max_branches=1,
        basic_analytics=True,
        advanced_analytics=False,
        whatsapp_integration=False,  # Add-on
        family_poll=False,
        motion_3d_features=False,
        priority_support=False,
    ),
    PlanTier.GOLD: PlanEntitlements(
        tier=PlanTier.GOLD,
        display_name="Gold Retail Growth",
        monthly_tryons=1500,
        max_users=8,
        max_kiosks=3,
        max_products=2000,
        max_branches=3,
        basic_analytics=True,
        advanced_analytics=True,
        whatsapp_integration=True,
        family_poll=True,
        motion_3d_features=False,  # Add-on
        priority_support=True,
    ),
    PlanTier.PLATINUM: PlanEntitlements(
        tier=PlanTier.PLATINUM,
        display_name="Platinum Enterprise Showroom",
        monthly_tryons=3500,
        max_users=20,
        max_kiosks=10,
        max_products=10000,
        max_branches=10,
        basic_analytics=True,
        advanced_analytics=True,
        whatsapp_integration=True,
        family_poll=True,
        motion_3d_features=True,
        priority_support=True,
    ),
}


# Canonical Role-Permission Matrix
ROLE_PERMISSIONS: Dict[UserRole, List[str]] = {
    UserRole.SUPER_ADMIN: [
        "*",  # Global cross-tenant superuser
        "tenant:create", "tenant:read", "tenant:update", "tenant:delete", "tenant:suspend",
        "plan:manage", "billing:override", "audit:read_all", "system:configure",
    ],
    UserRole.TENANT_OWNER: [
        "tenant:read_own", "tenant:update_own",
        "user:invite", "user:manage", "user:remove",
        "kiosk:register", "kiosk:manage", "kiosk:deactivate",
        "branch:manage", "product:manage", "catalog:manage",
        "subscription:view", "invoice:view", "analytics:view",
        "counter_token:manage", "family_poll:manage",
    ],
    UserRole.STORE_MANAGER: [
        "tenant:read_own",
        "user:read", "user:invite_staff",
        "kiosk:read", "kiosk:unlock",
        "branch:read", "product:manage", "catalog:manage",
        "analytics:view", "counter_token:manage", "family_poll:manage",
        "tryon:history_view",
    ],
    UserRole.STAFF: [
        "tenant:read_own",
        "product:read", "catalog:read",
        "counter_token:view", "counter_token:attend", "counter_token:complete",
        "kiosk:unlock_assist", "tryon:run_assisted",
    ],
    UserRole.KIOSK_DEVICE: [
        "kiosk:heartbeat", "kiosk:telemetry",
        "catalog:read_active", "tryon:create_job", "tryon:poll_job",
        "token:create_counter", "token:create_download",
    ],
    UserRole.READ_ONLY: [
        "tenant:read_own", "catalog:read", "analytics:view_basic", "tryon:read_public",
    ],
}


# Data Entity Ownership Scope Policy
ENTITY_TENANT_POLICY: Dict[str, Dict[str, Any]] = {
    "shops": {
        "scope_column": "id",
        "description": "Tenant root identity. Super admin can see all; tenant roles only see their own.",
    },
    "branches": {
        "scope_column": "shop_id",
        "description": "Physical retail branches. Belongs strictly to a shop.",
    },
    "kiosks": {
        "scope_column": "branch.shop_id",
        "description": "Hardware touch screen devices. Bound to branch and inherits tenant shop_id.",
    },
    "admin_users": {
        "scope_column": "shop_id",
        "description": "Showroom operators and staff. Super admin has shop_id=None or special flag.",
    },
    "products": {
        "scope_column": "shop_id",
        "description": "Saree and garment inventory. Partitioned by shop_id.",
    },
    "categories": {
        "scope_column": "shop_id",
        "description": "Garment classifications (Silk, Banarasi, etc). Partitioned by shop_id.",
    },
    "tryon_jobs": {
        "scope_column": "shop_id",
        "description": "AI try-on inference records. Strictly filtered by shop_id for tenant privacy.",
    },
    "media": {
        "scope_column": "shop_id/session_id",
        "description": "Customer photos and try-on output. Private tenant directory isolation.",
    },
    "counter_tokens": {
        "scope_column": "shop_id",
        "description": "Sales desk queue tickets. Isolated per showroom.",
    },
    "family_polls": {
        "scope_column": "shop_id",
        "description": "WhatsApp voting polls created by showroom customers. Scoped to shop_id.",
    },
    "usage_analytics": {
        "scope_column": "shop_id",
        "description": "Try-on counts, conversion metrics, staff performance. Scoped to shop_id.",
    },
}
