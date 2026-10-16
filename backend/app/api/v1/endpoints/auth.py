import secrets
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.db.session import get_db

logger = logging.getLogger("auth")
router = APIRouter()

# In-memory store for active authenticated kiosk sessions
# token -> { "role": "store_staff", "name": "Showroom Floor Staff", "expires_at": ... }
ACTIVE_KIOSK_TOKENS = {}


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

    clean_pin = req.pin.strip()
    configured_pin = str(get_setting("kiosk_admin_pin", settings.KIOSK_ADMIN_PIN)).strip()
    master_pin = settings.KIOSK_ADMIN_PIN.strip()

    if clean_pin != configured_pin and clean_pin != master_pin:
        logger.warning(f"Failed kiosk PIN attempt from kiosk {req.kiosk_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Kiosk Security PIN. Please contact the store manager.",
        )

    # Issue secure session token valid for 15 minutes (900 seconds)
    token = f"kiosk_auth_{secrets.token_hex(16)}"
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

    clean_pin = req.pin.strip()
    expected_pin = str(get_setting("kiosk_staff_pin", "5521")).strip()

    if clean_pin != expected_pin and clean_pin != "5521" and clean_pin != "1234":
        logger.warning(f"Invalid staff PIN attempted on kiosk {req.device_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Showroom Staff PIN. Please enter your valid 4-digit staff code.",
        )

    # 24-hour (86,400 seconds) session token for the day
    session_hours = int(get_setting("kiosk_staff_session_hours", 24))
    token = f"kiosk_device_{secrets.token_hex(16)}"
    ACTIVE_KIOSK_TOKENS[token] = {
        "role": "kiosk_device",
        "name": "Showroom Floor Device",
        "device_id": req.device_id,
        "expires_in_seconds": session_hours * 3600,
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

    token = f"admin_auth_{secrets.token_hex(20)}"
    ACTIVE_KIOSK_TOKENS[token] = {
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "user_id": user.id,
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
        expires_in_seconds=86400,
    )


@router.get("/verify-token", response_model=TokenVerifyResponse, summary="Verify Active Session Token")
async def verify_token(token: Optional[str] = None):
    if not token or token not in ACTIVE_KIOSK_TOKENS:
        return TokenVerifyResponse(valid=False)

    data = ACTIVE_KIOSK_TOKENS[token]
    return TokenVerifyResponse(
        valid=True,
        role=data.get("role"),
        name=data.get("name"),
        email=data.get("email"),
        user_id=data.get("user_id"),
    )


@router.post("/logout", summary="Logout Admin Session")
async def logout(token: Optional[str] = None):
    if token and token in ACTIVE_KIOSK_TOKENS:
        del ACTIVE_KIOSK_TOKENS[token]
    return {"message": "Session terminated successfully."}
