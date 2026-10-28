from typing import Optional, List, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from pydantic import BaseModel

from backend.app.core.security import decode_access_token


class AuthenticatedUser(BaseModel):
    user_id: str
    role: str
    shop_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    token: Optional[str] = None,
) -> AuthenticatedUser:
    """
    Reusable FastAPI dependency to resolve and verify the current authenticated user.
    Extracts Bearer token from the standard Authorization header (or transitional query param 'token').
    """
    raw_token = None
    if authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()
    elif token:
        from backend.app.core.config import settings
        if settings.APP_ENV == "production":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passing authentication tokens via URL query parameters is prohibited in production. Provide token in the 'Authorization: Bearer <token>' header.",
            )
        raw_token = token.strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = decode_access_token(raw_token)
    if not claims:
        # Fallback to in-memory store for transitional tokens during migration
        from backend.app.api.v1.endpoints.auth import ACTIVE_KIOSK_TOKENS
        if raw_token in ACTIVE_KIOSK_TOKENS:
            data = ACTIVE_KIOSK_TOKENS[raw_token]
            return AuthenticatedUser(
                user_id=data.get("user_id") or data.get("kiosk_id") or data.get("device_id") or "legacy_session",
                role=data.get("role", "store_staff"),
                shop_id=data.get("shop_id"),
                name=data.get("name"),
                email=data.get("email"),
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(
        user_id=str(claims.get("user_id") or claims.get("sub") or "anonymous"),
        role=claims.get("role", "customer"),
        shop_id=claims.get("shop_id"),
        name=claims.get("name"),
        email=claims.get("email"),
    )


def require_roles(*allowed_roles: str):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces that the authenticated user possesses one of the designated roles.
    """
    async def role_checker(
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {allowed_roles}, but current role is '{current_user.role}'.",
            )
        return current_user

    return role_checker


# Convenient pre-configured role dependencies
require_super_admin = require_roles("super_admin")
require_tenant_owner = require_roles("super_admin", "tenant_owner", "shop_owner")
require_manager = require_roles("super_admin", "tenant_owner", "shop_owner", "store_manager")
require_staff = require_roles("super_admin", "tenant_owner", "shop_owner", "store_manager", "store_staff", "staff")
require_kiosk_device = require_roles("super_admin", "kiosk_device")


async def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    token: Optional[str] = None,
) -> Optional[AuthenticatedUser]:
    """Optional authentication dependency; returns None if credentials are not provided."""
    try:
        return await get_current_user(authorization=authorization, token=token)
    except HTTPException:
        return None


def enforce_tenant_scope(
    current_user: AuthenticatedUser,
    target_shop_id: Optional[str] = None,
) -> Optional[str]:
    """
    Enforces tenant/shop scope isolation:
    - Super admins have global cross-tenant access when target_shop_id is None.
      If target_shop_id is passed, they target that specific shop.
    - Tenant roles (shop_owner, store_manager, store_staff, kiosk_device) are strictly bound to current_user.shop_id.
    - Any attempt to access or mutate another shop's resources raises HTTP 403 Forbidden.
    """
    if current_user.role == "super_admin":
        return target_shop_id

    user_shop = current_user.shop_id or "shop_default"
    if target_shop_id and target_shop_id != user_shop:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-tenant access denied. Your account is bound to shop '{user_shop}' and cannot access resources of shop '{target_shop_id}'.",
        )
    return user_shop

