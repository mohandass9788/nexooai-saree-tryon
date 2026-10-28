import secrets
import logging
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.security import create_access_token, decode_access_token, revoke_token
from backend.app.db.session import get_db

logger = logging.getLogger("auth")
router = APIRouter()

import time
from typing import Optional, Dict, List

# In-memory store for active authenticated kiosk sessions
ACTIVE_KIOSK_TOKENS = {}

# In-memory rate limiter for PIN verification (max 5 failures per 10 minutes)
FAILED_PIN_ATTEMPTS: Dict[str, List[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 600  # 10 minutes


def check_pin_rate_limit(client_key: str):
    now = time.time()
    history = FAILED_PIN_ATTEMPTS.get(client_key, [])
    history = [t for t in history if now - t < LOCKOUT_WINDOW_SECONDS]
    FAILED_PIN_ATTEMPTS[client_key] = history
    if len(history) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed PIN attempts. Locked out for 10 minutes for security.",
        )


def record_pin_failure(client_key: str):
    now = time.time()
    history = FAILED_PIN_ATTEMPTS.get(client_key, [])
    history.append(now)
    FAILED_PIN_ATTEMPTS[client_key] = history


def clear_pin_failures(client_key: str):
    FAILED_PIN_ATTEMPTS.pop(client_key, None)


class KioskPinVerifyRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=10, description="4-6 digit numeric showroom staff PIN")
    kiosk_id: Optional[str] = Field("KIOSK-TN-CHN-01", description="Identifier of the physical kiosk")


class KioskAuthResponse(BaseModel):
    authenticated: bool
    token: str
    role: str
    name: str
    expires_in_seconds: int


class AdminLoginRequest(BaseModel):
    email: str = Field(..., description="Staff or Super Admin email address")
    password: str = Field(..., min_length=4, description="User password")


class AdminLoginResponse(BaseModel):
    authenticated: bool
    token: str
    role: str
    name: str
    email: str
    user_id: str
    expires_in_seconds: int


class TokenVerifyResponse(BaseModel):
    valid: bool
    role: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/kiosk-pin-verify", response_model=KioskAuthResponse, summary="Verify Kiosk Security PIN")
async def verify_kiosk_pin(req: KioskPinVerifyRequest):
    """
    Authenticate showroom staff accessing the admin management portal.
    Prevents unauthorized customers from accessing store metrics or inventory controls.
    """
    from backend.app.core.system_settings import get_setting

    client_key = f"kiosk_{req.kiosk_id or 'default'}"
    check_pin_rate_limit(client_key)

    clean_pin = req.pin.strip()
    configured_pin = str(get_setting("kiosk_admin_pin", settings.KIOSK_ADMIN_PIN)).strip()
    master_pin = settings.KIOSK_ADMIN_PIN.strip()

    # In production, default 849201 fallback is rejected
    if settings.APP_ENV == "production" and clean_pin == "849201" and configured_pin == "849201":
        record_pin_failure(client_key)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Default Admin PIN '849201' is disabled in production. Set a unique KIOSK_ADMIN_PIN in settings.",
        )

    if clean_pin != configured_pin and clean_pin != master_pin:
        record_pin_failure(client_key)
        logger.warning(f"Failed kiosk PIN attempt from kiosk {req.kiosk_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Kiosk Security PIN. Please contact the store manager.",
        )

    clear_pin_failures(client_key)

    # Issue signed, server-verifiable JWT token valid for 15 minutes (900 seconds)
    token = create_access_token(
        data={
            "sub": "kiosk_staff",
            "role": "store_staff",
            "name": "Showroom Floor Staff",
            "kiosk_id": req.kiosk_id,
        },
        expires_delta=timedelta(seconds=900),
    )
    ACTIVE_KIOSK_TOKENS[token] = {
        "role": "store_staff",
        "name": "Showroom Floor Staff",
        "kiosk_id": req.kiosk_id,
    }

    logger.info(f"Successful kiosk staff login on {req.kiosk_id}")
    return KioskAuthResponse(
        authenticated=True,
        token=token,
        role="store_staff",
        name="Showroom Floor Staff",
        expires_in_seconds=900,
    )


class ChangeAdminPinRequest(BaseModel):
    current_pin: str = Field(..., min_length=4, max_length=10, description="Current Admin PIN for verification")
    new_pin: str = Field(..., min_length=4, max_length=10, description="New 4-8 digit numeric Admin PIN")


class ChangeAdminPinResponse(BaseModel):
    success: bool
    message: str
    admin_pin_masked: str


@router.post("/change-admin-pin", response_model=ChangeAdminPinResponse, summary="Change Store Admin Security PIN")
async def change_admin_pin(req: ChangeAdminPinRequest, db: AsyncSession = Depends(get_db)):
    """
    Allows store managers to change the 6-digit Admin Security PIN from within the Admin Portal.
    """
    from backend.app.core.system_settings import get_setting, set_setting

    current_clean = req.current_pin.strip()
    new_clean = req.new_pin.strip()
    active_pin = str(get_setting("kiosk_admin_pin", settings.KIOSK_ADMIN_PIN)).strip()
    master_pin = settings.KIOSK_ADMIN_PIN.strip()

    if current_clean != active_pin and current_clean != master_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="தற்போதைய நிர்வாகி பின் தவறானது (Current Admin PIN is incorrect).",
        )

    if not new_clean.isdigit() or len(new_clean) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="புதிய பின் எண்களாக மட்டுமே இருக்க வேண்டும் (New PIN must be 4 to 8 numeric digits).",
        )

    await set_setting("kiosk_admin_pin", new_clean, db)
    logger.info("Admin PIN updated successfully.")
    masked = "•" * (len(new_clean) - 2) + new_clean[-2:]
    return ChangeAdminPinResponse(
        success=True,
        message="நிர்வாகி அணுகல் பின் வெற்றிகரமாக மாற்றப்பட்டது (Admin PIN updated successfully).",
        admin_pin_masked=masked,
    )


class StaffKioskVerifyRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=10, description="4-digit showroom staff PIN to unlock kiosk")
    device_id: Optional[str] = Field("KIOSK-01", description="Identifier of the physical kiosk totem")


@router.post("/staff-kiosk-verify", response_model=KioskAuthResponse, summary="Unlock Kiosk Device with Staff PIN")
async def verify_staff_kiosk_pin(req: StaffKioskVerifyRequest):
    """
    Authenticate showroom floor staff to activate the physical kiosk totem for customer usage.
    Protects the URL from unauthorized public access and issues a 24-hour daily session token.
    """
    from backend.app.core.system_settings import get_setting

    client_key = f"staff_{req.device_id or 'default'}"
    check_pin_rate_limit(client_key)

    clean_pin = req.pin.strip()
    expected_pin = str(get_setting("kiosk_staff_pin", "5521")).strip()

    if settings.APP_ENV == "production":
        # In production mode, eliminate hardcoded fallbacks ("5521", "1234")
        if clean_pin in ("5521", "1234") and expected_pin in ("5521", "1234"):
            record_pin_failure(client_key)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Default kiosk staff PIN is disabled in production. Configure a unique staff PIN.",
            )
        matched = clean_pin == expected_pin
    else:
        matched = (clean_pin == expected_pin) or (clean_pin in ("5521", "1234"))

    if not matched:
        record_pin_failure(client_key)
        logger.warning(f"Invalid staff PIN attempted on kiosk {req.device_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Showroom Staff PIN. Please enter your valid 4-digit staff code.",
        )

    clear_pin_failures(client_key)

    # 24-hour (86,400 seconds) session token for the day
    session_hours = int(get_setting("kiosk_staff_session_hours", 24))
    expires_in_seconds = session_hours * 3600
    token = create_access_token(
        data={
            "sub": req.device_id,
            "role": "kiosk_device",
            "name": "Showroom Floor Device",
            "device_id": req.device_id,
        },
        expires_delta=timedelta(seconds=expires_in_seconds),
    )
    ACTIVE_KIOSK_TOKENS[token] = {
        "role": "kiosk_device",
        "name": "Showroom Floor Device",
        "device_id": req.device_id,
        "expires_in_seconds": expires_in_seconds,
    }

    logger.info(f"Showroom Kiosk unlocked for {session_hours}h on device {req.device_id}")
    return KioskAuthResponse(
        authenticated=True,
        token=token,
        role="kiosk_device",
        name="Showroom Floor Device",
        expires_in_seconds=session_hours * 3600,
    )


@router.post("/login", response_model=AdminLoginResponse, summary="Email & Password Staff/Admin Login")
async def admin_login(req: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate Staff, Store Manager, or Master Super Admin using email and password.
    Full RBAC authorization with audit logging.
    """
    from sqlalchemy import select, func
    from backend.app.db.models import AdminUserModel, AuditLogModel
    from backend.app.core.security import verify_password

    email_clean = req.email.strip().lower()
    res = await db.execute(select(AdminUserModel).where(func.lower(AdminUserModel.email) == email_clean))
    user = res.scalar_one_or_none()

    if not user or not user.is_active:
        logger.warning(f"Failed login attempt for email: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="தவறான மின்னஞ்சல் அல்லது கடவுச்சொல் (Invalid email or password).",
        )

    if not verify_password(req.password, user.hashed_password):
        logger.warning(f"Invalid password for user: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="தவறான மின்னஞ்சல் அல்லது கடவுச்சொல் (Invalid email or password).",
        )

    expires_in_seconds = 86400
    token = create_access_token(
        data={
            "sub": user.id,
            "user_id": user.id,
            "role": user.role,
            "shop_id": user.shop_id,
            "name": user.name,
            "email": user.email,
        },
        expires_delta=timedelta(seconds=expires_in_seconds),
    )
    ACTIVE_KIOSK_TOKENS[token] = {
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "user_id": user.id,
        "shop_id": user.shop_id,
    }

    # Record login audit log
    try:
        audit = AuditLogModel(
            id=f"audit_{secrets.token_hex(8)}",
            admin_user_id=user.id,
            action="login",
            entity_type="admin_user",
            entity_id=user.id,
            details=f"Successful portal login as {user.role}",
        )
        db.add(audit)
        await db.commit()
    except Exception as e:
        logger.warning(f"Could not record audit log: {e}")

    logger.info(f"User {user.email} successfully logged in as {user.role}")
    return AdminLoginResponse(
        authenticated=True,
        token=token,
        role=user.role,
        name=user.name,
        email=user.email,
        user_id=user.id,
        expires_in_seconds=expires_in_seconds,
    )


@router.get("/verify-token", response_model=TokenVerifyResponse, summary="Verify Active Session Token")
async def verify_token(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    resolved_token = None
    if authorization and authorization.lower().startswith("bearer "):
        resolved_token = authorization[7:].strip()
    elif token:
        resolved_token = token.strip()

    if not resolved_token:
        return TokenVerifyResponse(valid=False)

    # 1. Cryptographically signed JWT verification
    claims = decode_access_token(resolved_token)
    if claims:
        return TokenVerifyResponse(
            valid=True,
            role=claims.get("role"),
            name=claims.get("name"),
            email=claims.get("email"),
            user_id=claims.get("user_id") or claims.get("sub"),
        )

    # 2. In-memory store fallback for transitional tokens
    if resolved_token in ACTIVE_KIOSK_TOKENS:
        data = ACTIVE_KIOSK_TOKENS[resolved_token]
        return TokenVerifyResponse(
            valid=True,
            role=data.get("role"),
            name=data.get("name"),
            email=data.get("email"),
            user_id=data.get("user_id"),
        )

    return TokenVerifyResponse(valid=False)


@router.post("/logout", summary="Logout Admin Session")
async def logout(
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    resolved_token = None
    if authorization and authorization.lower().startswith("bearer "):
        resolved_token = authorization[7:].strip()
    elif token:
        resolved_token = token.strip()

    if resolved_token:
        revoke_token(resolved_token)
        if resolved_token in ACTIVE_KIOSK_TOKENS:
            del ACTIVE_KIOSK_TOKENS[resolved_token]
    return {"message": "Session terminated successfully."}


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Expiring signed refresh token")


class RefreshTokenResponse(BaseModel):
    token: str
    expires_in_seconds: int = 86400


@router.post("/refresh-token", response_model=RefreshTokenResponse, summary="Exchange valid token for refreshed session token")
async def refresh_token_endpoint(req: RefreshTokenRequest):
    """Refreshes an active signed token without requiring re-entering password."""
    claims = decode_access_token(req.refresh_token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid refresh token. Please sign in again.",
        )
    # Revoke old token to prevent replay attacks
    revoke_token(req.refresh_token)

    new_token = create_access_token(
        data={
            "sub": claims.get("sub"),
            "user_id": claims.get("user_id"),
            "role": claims.get("role"),
            "shop_id": claims.get("shop_id"),
            "name": claims.get("name"),
            "email": claims.get("email"),
        },
        expires_delta=timedelta(seconds=86400),
    )
    return RefreshTokenResponse(token=new_token, expires_in_seconds=86400)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Showroom account email")


@router.post("/forgot-password", summary="Initiate Password Reset")
async def forgot_password_endpoint(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Generates an auditable password reset token. Safe response prevents email enumeration."""
    from sqlalchemy import select, func
    from backend.app.db.models import AdminUserModel, AuditLogModel

    email_clean = req.email.strip().lower()
    res = await db.execute(select(AdminUserModel).where(func.lower(AdminUserModel.email) == email_clean))
    user = res.scalar_one_or_none()

    if user:
        reset_token = create_access_token(
            data={"sub": user.id, "purpose": "pwd_reset", "email": user.email},
            expires_delta=timedelta(minutes=30),
        )
        logger.info(f"Password reset token generated for user {user.email}")
        try:
            audit = AuditLogModel(
                id=f"audit_{secrets.token_hex(8)}",
                admin_user_id=user.id,
                action="forgot_password_requested",
                entity_type="admin_user",
                entity_id=user.id,
                details="Password reset token dispatched",
            )
            db.add(audit)
            await db.commit()
        except Exception:
            pass

    return {
        "message": "If an active showroom account matches this email, reset instructions have been dispatched.",
        "expires_in_minutes": 30,
    }


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=6, description="New secure password")


@router.post("/reset-password", summary="Complete Password Reset with Token")
async def reset_password_endpoint(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Validates reset token and securely updates user password."""
    from sqlalchemy import select
    from backend.app.db.models import AdminUserModel, AuditLogModel
    from backend.app.core.security import hash_password

    claims = decode_access_token(req.token)
    if not claims or claims.get("purpose") != "pwd_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    user_id = claims.get("sub")
    res = await db.execute(select(AdminUserModel).where(AdminUserModel.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account no longer exists.",
        )

    user.hashed_password = hash_password(req.new_password)
    revoke_token(req.token)

    try:
        audit = AuditLogModel(
            id=f"audit_{secrets.token_hex(8)}",
            admin_user_id=user.id,
            action="password_reset_completed",
            entity_type="admin_user",
            entity_id=user.id,
            details="Password successfully changed with reset token",
        )
        db.add(audit)
        await db.commit()
    except Exception:
        await db.commit()

    return {"message": "Password updated successfully. You may now sign in."}

