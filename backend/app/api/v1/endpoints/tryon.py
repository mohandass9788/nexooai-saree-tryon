import os
import uuid
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.app.core.config import settings
from backend.app.core.system_settings import get_setting
from backend.app.db.session import get_db
from backend.app.db.models import (
    TryOnJobModel,
    TryOnSessionModel,
    ConsentAuditModel,
    DownloadTokenModel,
    ProductModel,
)
from backend.app.schemas.tryon import TryOnJobResponse
from backend.app.services.tryon.factory import get_tryon_engine
from backend.app.services.tryon.gemini_guard import gemini_pose_guard, PoseValidationResult
from backend.app.services.tokens.token_service import token_service
from backend.app.services.storage.local_storage import storage_service

logger = logging.getLogger("tryon")
router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/validate-pose", response_model=PoseValidationResult, summary="Pre-validate customer pose using Gemini Vision")
async def validate_customer_pose(
    person_image: UploadFile = File(..., description="Customer portrait photo to evaluate"),
):
    """
    Evaluates pose quality and body framing BEFORE calling expensive AI Try-On generation.
    Returns green_tick: True only when suitable for clothing draping.
    """
    if person_image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported format '{person_image.content_type}'. Allowed: JPEG, PNG, WEBP.",
        )

    image_bytes = await person_image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image uploaded.")

    result = await gemini_pose_guard.validate_pose(image_bytes)
    return result


@router.post("", response_model=TryOnJobResponse, summary="Submit Try-On Job")
async def create_tryon_job(
    person_image: UploadFile = File(..., description="Customer portrait photo"),
    saree_id: Optional[str] = Form(None, description="Selected saree SKU or ID"),
    garment_image: Optional[UploadFile] = File(None, description="Custom uploaded or captured garment photo"),
    consent_confirmed: bool = Form(..., description="Customer photo consent confirmation"),
    language: str = Form("ta", description="Interface language ('ta' or 'en')"),
    session_id: Optional[str] = Form(None, description="Optional Kiosk session ID"),
    kiosk_id: Optional[str] = Form("KIOSK-TN-CHN-01", description="Identifier of the physical kiosk hardware"),
    db: AsyncSession = Depends(get_db),
):
    # 1. Enforce Explicit Photo Consent
    if not consent_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo consent is required to process the virtual try-on session.",
        )

    # 2. Validate Person Image MIME type
    if person_image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported format '{person_image.content_type}'. Allowed: JPEG, PNG, WEBP.",
        )

    # 3. Read and validate person file size
    person_image_bytes = await person_image.read()
    if len(person_image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Person photo exceeds the 10 MB maximum allowed file size.",
        )

    if len(person_image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded person photo is empty.",
        )

    active_session_id = session_id or f"sess_{secrets.token_hex(8)}"

    # Audit customer consent in DB
    try:
        consent_record = ConsentAuditModel(
            session_id=active_session_id,
            kiosk_id=kiosk_id,
            consent_confirmed=True,
            language=language,
            created_at=datetime.utcnow(),
        )
        db.add(consent_record)

        # Register tryon session if not existing
        sess_check = await db.execute(select(TryOnSessionModel).where(TryOnSessionModel.id == active_session_id))
        if not sess_check.scalar_one_or_none():
            db.add(
                TryOnSessionModel(
                    id=active_session_id,
                    kiosk_id=kiosk_id,
                    language=language,
                    consent_accepted=True,
                    started_at=datetime.utcnow(),
                )
            )
        await db.flush()
    except Exception as e:
        logger.warning(f"Could not record consent audit: {e}")

    # 4. Resolve Product/Garment Image (Custom Upload vs Catalogue Saree)
    saree_image_bytes = b""
    saree_meta = None
    target_product_id = saree_id or "custom_product"

    # Always attempt metadata lookup if saree_id is provided
    if saree_id and saree_id != "custom_product":
        try:
            from sqlalchemy import or_, func
            stmt = select(ProductModel).where(
                or_(
                    ProductModel.id == saree_id,
                    func.lower(ProductModel.sku) == saree_id.lower(),
                )
            )
            res = await db.execute(stmt)
            saree_meta = res.scalar_one_or_none()
        except Exception as e:
            logger.warning(f"Database lookup for saree {saree_id} failed: {e}")

        if not saree_meta:
            from backend.app.api.v1.endpoints.catalog import SAMPLE_SAREES
            for s in SAMPLE_SAREES:
                if s.id == saree_id or s.sku.lower() == saree_id.lower():
                    saree_meta = s
                    break

    # Check for binary garment image upload
    has_custom_garment = garment_image is not None and bool(getattr(garment_image, "filename", None))

    if has_custom_garment:
        if garment_image.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported garment format '{garment_image.content_type}'. Allowed: JPEG, PNG, WEBP.",
            )
        saree_image_bytes = await garment_image.read()
        if len(saree_image_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Custom product photo exceeds the 10 MB maximum allowed file size.",
            )
        if len(saree_image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded custom product photo is empty.",
            )
        target_product_id = saree_meta.id if saree_meta else (saree_id or "custom_product")
    else:
        # Require saree_id when no custom garment is uploaded
        if not saree_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either saree_id or garment_image must be provided.",
            )

        try:
            from sqlalchemy import or_, func
            stmt = select(ProductModel).where(
                or_(
                    ProductModel.id == saree_id,
                    func.lower(ProductModel.sku) == saree_id.lower(),
                )
            )
            res = await db.execute(stmt)
            saree_meta = res.scalar_one_or_none()
        except Exception as e:
            logger.warning(f"Database lookup for saree {saree_id} failed: {e}")

        if not saree_meta:
            from backend.app.api.v1.endpoints.catalog import SAMPLE_SAREES
            for s in SAMPLE_SAREES:
                if s.id == saree_id or s.sku.lower() == saree_id.lower():
                    saree_meta = s
                    break

        if saree_meta and saree_meta.primary_image_url:
            img_rel = saree_meta.primary_image_url.replace("/static/", "")
            candidate_paths = [
                os.path.join("backend", "app", "static", img_rel),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", img_rel),
                os.path.join("backend", "app", "static", "sarees", os.path.basename(img_rel)),
            ]
            for p in candidate_paths:
                if os.path.exists(p):
                    try:
                        with open(p, "rb") as f:
                            saree_image_bytes = f.read()
                        break
                    except Exception:
                        pass
        target_product_id = saree_meta.id if saree_meta else saree_id

    # 5. Dispatch to Pluggable AI Adapter
    engine = get_tryon_engine()
    engine_result = await engine.process_tryon(
        person_image_bytes=person_image_bytes,
        saree_image_bytes=saree_image_bytes,
        options={
            "saree_id": target_product_id,
            "language": language,
            "category": saree_meta.category if saree_meta else "Custom Saree",
            "name_en": saree_meta.name_en if saree_meta else "Custom Showroom Saree",
            "name_ta": saree_meta.name_ta if saree_meta else "தனிப்பயன் ஷோரூம் புடவை",
            "price": f"₹{saree_meta.price:,.0f}" if (saree_meta and hasattr(saree_meta, "price") and saree_meta.price) else "Showroom Special",
            "fabric": getattr(saree_meta, "fabric", "Custom Material"),
            "color": getattr(saree_meta, "color", "Custom Tone"),
            "sku": getattr(saree_meta, "sku", "CUSTOM-01"),
        },
    )

    if engine_result.status == "failed":
        # Record failed job in DB
        try:
            failed_job = TryOnJobModel(
                id=engine_result.provider_job_id or f"job_fail_{secrets.token_hex(6)}",
                session_id=active_session_id,
                product_id=target_product_id,
                kiosk_id=kiosk_id,
                status="failed",
                provider=engine_result.provider_name,
                error_message=engine_result.error_message,
                processing_time_ms=engine_result.processing_time_ms,
                created_at=datetime.utcnow(),
            )
            db.add(failed_job)
            await db.commit()
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=engine_result.error_message or "Try-on engine processing failed.",
        )

    job_id = engine_result.provider_job_id
    result_bytes = engine_result.result_image_bytes or person_image_bytes

    # 6. Resolve retention minutes from system settings
    try:
        retention_mins = int(get_setting("photo_retention_minutes", settings.MEDIA_RETENTION_HOURS * 60))
    except Exception:
        retention_mins = settings.MEDIA_RETENTION_HOURS * 60

    # Persist customer original portrait photo
    customer_photo_id = f"person_{job_id}"
    await storage_service.save_media(
        file_id=customer_photo_id,
        data=person_image_bytes,
        media_type=person_image.content_type or "image/jpeg",
        retention_minutes=retention_mins,
    )

    # Persist result in secure storage with retention expiration
    stored_media = await storage_service.save_media(
        file_id=job_id,
        data=result_bytes,
        media_type="image/jpeg",
        retention_minutes=retention_mins,
    )

    # 7. Generate unguessable, expiring download token
    token_meta = token_service.create_download_token(job_id=job_id, max_downloads=5)

    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=retention_mins)

    # 8. Persist Job and Token in Database
    try:
        # Check if target_product_id exists in products table, otherwise fallback or create
        check_p = await db.execute(select(ProductModel).where(ProductModel.id == target_product_id))
        if not check_p.scalar_one_or_none():
            # Check if custom_product exists
            check_cp = await db.execute(select(ProductModel).where(ProductModel.id == "custom_product"))
            if check_cp.scalar_one_or_none():
                target_product_id = "custom_product"
            else:
                # Use first existing product or insert fallback
                any_p = await db.execute(select(ProductModel.id).limit(1))
                first_pid = any_p.scalar_one_or_none()
                if first_pid:
                    target_product_id = first_pid

        token_exp = token_meta.expires_at.replace(tzinfo=None) if getattr(token_meta.expires_at, "tzinfo", None) else token_meta.expires_at

        job_record = TryOnJobModel(
            id=job_id,
            session_id=active_session_id,
            product_id=target_product_id,
            kiosk_id=kiosk_id,
            status=engine_result.status,
            provider=engine_result.provider_name,
            person_image_path=f"/api/v1/tryon/jobs/{job_id}/customer-photo",
            result_image_path=stored_media.file_path if stored_media else f"media/{job_id}.jpg",
            download_token=token_meta.raw_token,
            download_token_expires_at=token_exp,
            processing_time_ms=engine_result.processing_time_ms,
            estimated_cost_usd=engine_result.estimated_cost_usd,
            expires_at=expires_at,
            created_at=now,
        )
        db.add(job_record)

        token_record = DownloadTokenModel(
            id=f"tok_{secrets.token_hex(8)}",
            job_id=job_id,
            raw_token=token_meta.raw_token,
            token_hash=token_meta.token_hash,
            expires_at=token_exp,
            download_count=0,
            max_downloads=5,
            created_at=now,
        )
        db.add(token_record)
        await db.commit()
    except Exception as e:
        logger.warning(f"Could not persist tryon job into database: {e}")
        await db.rollback()

    result_url = f"http://127.0.0.1:8000/api/v1/tryon/jobs/{job_id}/result"
    qr_url = f"http://127.0.0.1:8000/api/v1/tryon/download/{token_meta.raw_token}"

    return TryOnJobResponse(
        job_id=job_id,
        status=engine_result.status,
        provider=engine_result.provider_name,
        result_image_url=result_url,
        download_token=token_meta.raw_token,
        qr_download_url=qr_url,
        processing_time_ms=engine_result.processing_time_ms,
        estimated_cost_usd=engine_result.estimated_cost_usd,
    )


@router.get("/jobs/{job_id}/customer-photo", summary="Retrieve Customer Original Photo")
async def get_customer_photo(job_id: str):
    media_bytes = await storage_service.get_media(f"person_{job_id}")
    if not media_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer photo not found or retention period has expired.",
        )
    return Response(content=media_bytes, media_type="image/jpeg")


@router.get("/jobs/{job_id}/result", summary="Retrieve Generated Image Result")
async def get_job_result(job_id: str):
    media_bytes = await storage_service.get_media(job_id)
    if not media_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result image not found or retention period has expired.",
        )
    return Response(content=media_bytes, media_type="image/jpeg")


@router.get("/download/{token}", summary="Download Result via Secure QR Token")
async def download_by_token(token: str, db: AsyncSession = Depends(get_db)):
    # 1. First validate via in-memory/crypto token service
    token_meta = token_service.validate_and_consume_token(token)

    # 2. Check and sync with database if token_service gave hit or if inspecting DB
    job_id = None
    if token_meta:
        job_id = token_meta.job_id
        try:
            res = await db.execute(select(DownloadTokenModel).where(DownloadTokenModel.raw_token == token))
            db_token = res.scalar_one_or_none()
            if db_token:
                db_token.download_count += 1
                await db.commit()
        except Exception:
            pass
    else:
        # Fallback query from DB
        try:
            res = await db.execute(select(DownloadTokenModel).where(DownloadTokenModel.raw_token == token))
            db_token = res.scalar_one_or_none()
            if db_token:
                now = datetime.utcnow()
                if db_token.expires_at > now and db_token.download_count < db_token.max_downloads:
                    db_token.download_count += 1
                    job_id = db_token.job_id
                    await db.commit()
        except Exception:
            pass

    if not job_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download token is invalid, expired, or maximum download attempts reached.",
        )

    media_bytes = await storage_service.get_media(job_id)
    if not media_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested try-on image not found or retention period has expired.",
        )

    return Response(
        content=media_bytes,
        media_type="image/jpeg",
        headers={"Content-Disposition": 'attachment; filename="nexooai_saree_preview.jpg"'},
    )


class LookbookFeedItem(BaseModel):
    job_id: str
    created_at: str
    saree_name_en: str
    saree_name_ta: str
    category: str
    price: int
    result_image_url: str


@router.get("/today-feed", response_model=List[LookbookFeedItem], summary="Today's Lookbook Showcase Feed")
async def get_today_lookbook_feed(db: AsyncSession = Depends(get_db)):
    """
    Public feed of completed saree try-on looks for the showroom screensaver.
    Rotates elegant drape showcase without exposing customer portrait photos or download tokens.
    """
    feed_items = []
    try:
        from backend.app.db.models import TryOnJobModel
        now = datetime.utcnow()
        start_of_day = datetime(now.year, now.month, now.day)
        stmt = (
            select(TryOnJobModel)
            .where(
                and_(
                    TryOnJobModel.created_at >= start_of_day,
                    TryOnJobModel.status == "completed"
                )
            )
            .order_by(TryOnJobModel.created_at.desc())
            .limit(12)
        )
        res = await db.execute(stmt)
        jobs = res.scalars().all()
        for j in jobs:
            p_res = await db.execute(select(ProductModel).where(ProductModel.id == j.product_id))
            prod = p_res.scalar_one_or_none()
            name_en = prod.name_en if prod else "Royal Silk Saree"
            name_ta = prod.name_ta if prod else "பாரம்பரிய பட்டு"
            cat = prod.category if prod else "Bridal Silk"
            price = prod.price if prod else 18500.0

            feed_items.append(
                LookbookFeedItem(
                    job_id=j.id,
                    created_at=j.created_at.isoformat() if j.created_at else datetime.utcnow().isoformat(),
                    saree_name_en=name_en,
                    saree_name_ta=name_ta,
                    category=cat,
                    price=price,
                    result_image_url=f"/api/v1/tryon/jobs/{j.id}/result",
                )
            )
    except Exception as e:
        logger.warning(f"Error loading lookbook feed from DB: {e}")

    # Fallback showroom looks if no try-ons completed yet today
    if not feed_items:
        feed_items = [
            LookbookFeedItem(
                job_id="lb_001",
                created_at=datetime.utcnow().isoformat(),
                saree_name_en="Kanchipuram Crimson Zari Silk",
                saree_name_ta="காஞ்சிபுரம் சிவப்பு ஜரி பட்டு",
                category="Bridal Silk",
                price=18500,
                result_image_url="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80",
            ),
            LookbookFeedItem(
                job_id="lb_002",
                created_at=datetime.utcnow().isoformat(),
                saree_name_en="Banarasi Emerald Brocade Silk",
                saree_name_ta="பனாரசி மரகத ப்ரோகேட் பட்டு",
                category="Banarasi Silk",
                price=14200,
                result_image_url="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=80",
            ),
            LookbookFeedItem(
                job_id="lb_003",
                created_at=datetime.utcnow().isoformat(),
                saree_name_en="Mysore Royal Blue Crepe Silk",
                saree_name_ta="மைசூர் ராயல் நீல க்ரேப் பட்டு",
                category="Silk Sarees",
                price=11800,
                result_image_url="https://images.unsplash.com/photo-1610030469830-4e3a479ff708?auto=format&fit=crop&w=700&q=80",
            ),
        ]

    return feed_items
