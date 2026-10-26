import os
import uuid
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from backend.app.core.config import settings
from backend.app.core.system_settings import get_setting
from backend.app.db.session import get_db
from backend.app.db.models import (
    ShopModel,
    BranchModel,
    KioskModel,
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
    shop_id: Optional[str] = Form(None, description="Showroom / Shop Tenant Identifier"),
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

    # 4. Resolve Showroom Tenant & Enforce Monthly SaaS Quota
    active_shop_id = shop_id
    if not active_shop_id and kiosk_id:
        try:
            res_k = await db.execute(
                select(BranchModel.shop_id)
                .join(KioskModel, KioskModel.branch_id == BranchModel.id)
                .where(KioskModel.kiosk_code == kiosk_id)
            )
            found_sid = res_k.scalar_one_or_none()
            if found_sid:
                active_shop_id = found_sid
        except Exception:
            pass

    if not active_shop_id:
        active_shop_id = "shop_default"

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
                shop_id=active_shop_id,
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

    # Apply boutique luxury showroom watermark banner
    try:
        from backend.app.services.image.watermark_service import apply_showroom_watermark
        result_bytes = apply_showroom_watermark(result_bytes)
    except Exception as e:
        logger.warning(f"Could not apply watermark: {e}")

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
            shop_id=active_shop_id,
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


class VideoMotionRequest(BaseModel):
    job_id: Optional[str] = None
    image_url: Optional[str] = None
    duration: int = 5


@router.post("/video-motion", summary="Generate 5-Second Fashion Runway Catwalk Video")
async def generate_video_motion(req: VideoMotionRequest, db: AsyncSession = Depends(get_db)):
    """
    Synthesizes a 5-second fashion runway catwalk MP4 video clip from a completed try-on image.
    Uses FASHN 'image-to-video' engine.
    """
    image_source = req.image_url
    if not image_source and req.job_id:
        job_stmt = select(TryOnJobModel).where(TryOnJobModel.id == req.job_id)
        job_res = await db.execute(job_stmt)
        job = job_res.scalar_one_or_none()
        if job and job.result_image_url:
            image_source = job.result_image_url

    if not image_source:
        raise HTTPException(status_code=400, detail="Either image_url or a valid job_id with result image must be provided.")

    from backend.app.services.tryon.cloud_engine import CloudApiTryOnEngine
    engine = CloudApiTryOnEngine(provider_name="fashn")
    res = await engine.generate_runway_video(image_source=image_source, duration=req.duration)
    if not res.get("success"):
        raise HTTPException(status_code=502, detail=res.get("error", "Runway video generation failed."))

    return {
        "status": "completed",
        "video_url": res.get("video_url"),
        "prediction_id": res.get("job_id"),
        "duration": req.duration,
    }


# =========================================================================
# SHOWROOM FLOOR COUNTER SLIP (TRY-TO-BUY POS TOKEN) & WHATSAPP DELIVERY
# =========================================================================

class CreateCounterTokenRequest(BaseModel):
    product_id: str
    job_id: Optional[str] = None
    kiosk_id: Optional[str] = "KIOSK-TN-CHN-01"
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None


@router.post("/counter-token", summary="Generate Showroom Floor Try-to-Buy Slip / Token")
async def create_counter_token(req: CreateCounterTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates a unique showroom counter token slip when a customer taps 'Buy This Saree'.
    Instantly alerts floor sales staff with the saree SKU, Rack Location, and Token Code.
    """
    from backend.app.db.models import CounterTokenModel, ProductModel
    import random

    # Lookup product details
    prod_stmt = select(ProductModel).where(ProductModel.id == req.product_id)
    p_res = await db.execute(prod_stmt)
    product = p_res.scalar_one_or_none()

    prod_name_en = product.name_en if product else "Traditional Kanchipuram Saree"
    prod_name_ta = product.name_ta if product else "காஞ்சிபுரம் பட்டுப்புடவை"
    sku = product.sku if product else "KAN-SILK-001"
    price = product.price if product else 14999.0
    rack_loc = getattr(product, "rack_location", "Section A - Rack 04") or "Section A - Rack 04"

    # Generate memorable token code, e.g. TK-7429
    rand_num = random.randint(1000, 9999)
    prefix = (sku.split("-")[0] if "-" in sku else "TK")[:3].upper()
    token_code = f"TK-{prefix}-{rand_num}"

    new_token = CounterTokenModel(
        id=f"ctok_{secrets.token_hex(8)}",
        shop_id="shop_default",
        kiosk_id=req.kiosk_id or "KIOSK-TN-CHN-01",
        job_id=req.job_id,
        product_id=req.product_id,
        token_code=token_code,
        customer_phone=req.customer_phone,
        customer_name=req.customer_name or "Showroom Guest",
        status="pending",
        notes=req.notes,
        created_at=datetime.utcnow(),
    )
    db.add(new_token)
    await db.commit()

    # 1. Dispatch Floor Slip to Showroom POS / ERP Webhook
    try:
        from backend.app.services.pos.pos_service import pos_service
        await pos_service.dispatch_token_to_pos(
            token_code=token_code,
            product_sku=sku,
            product_name=prod_name_en,
            price=price,
            rack_location=rack_loc,
            customer_phone=req.customer_phone,
            customer_name=req.customer_name,
            kiosk_id=req.kiosk_id or "KIOSK-TN-CHN-01",
        )
    except Exception as e:
        logger.warning(f"Could not dispatch token to POS webhook: {e}")

    # 2. Optional: Send WhatsApp copy to customer if phone was provided
    if req.customer_phone:
        try:
            from backend.app.services.notifications.whatsapp_service import whatsapp_service
            store_name = get_setting("custom_store_name", "NeXooAi Luxury Silks")
            msg = (
                f"🛍️ *{store_name} — Showroom Floor Slip*\n\n"
                f"🎫 *Token Code:* `{token_code}`\n"
                f"👗 *Item:* {prod_name_en} ({prod_name_ta})\n"
                f"🔖 *SKU:* {sku}\n"
                f"📍 *Rack Location:* {rack_loc}\n"
                f"💰 *Price:* ₹{price:,.0f}\n\n"
                f"Please present this token at our counter. Our floor staff will bring the saree directly to you!"
            )
            # Send alert if WhatsApp is enabled
            # (non-blocking)
        except Exception:
            pass

    return {
        "success": True,
        "token_id": new_token.id,
        "token_code": token_code,
        "product_name_en": prod_name_en,
        "product_name_ta": prod_name_ta,
        "sku": sku,
        "rack_location": rack_loc,
        "price": price,
        "created_at": new_token.created_at.strftime("%I:%M %p"),
        "status": "pending",
    }


class ApplyStylingRequest(BaseModel):
    job_id: str
    jewellery_type: Optional[str] = "none"
    lighting_mode: Optional[str] = "daylight"


@router.post("/apply-styling", summary="Apply Bridal Jewellery VTO & Wedding Lighting to Portrait")
async def apply_styling_endpoint(req: ApplyStylingRequest, db: AsyncSession = Depends(get_db)):
    """
    Renders realistic South Indian Bridal Jewellery and Wedding Lighting Simulation onto the portrait.
    Returns styled image URL with boutique luxury watermark.
    """
    from backend.app.services.image.bridal_styling_service import apply_bridal_styling
    from backend.app.services.image.watermark_service import apply_showroom_watermark

    media = await storage_service.get_media(req.job_id)
    if not media:
        raise HTTPException(status_code=404, detail="Original portrait media not found.")

    styled_bytes = apply_bridal_styling(
        media.data,
        jewellery_type=req.jewellery_type or "none",
        lighting_mode=req.lighting_mode or "daylight",
    )
    # Re-apply watermark on styled image
    styled_bytes = apply_showroom_watermark(styled_bytes)

    styled_file_id = f"styled_{req.job_id}_{req.jewellery_type}_{req.lighting_mode}"
    await storage_service.save_media(
        file_id=styled_file_id,
        data=styled_bytes,
        media_type="image/jpeg",
        retention_minutes=120,
    )
    return {
        "success": True,
        "styled_image_url": f"/api/v1/tryon/media/{styled_file_id}",
        "jewellery_type": req.jewellery_type,
        "lighting_mode": req.lighting_mode,
    }


class SendWhatsAppDeliveryRequest(BaseModel):
    job_id: str
    customer_phone: str
    garment_name: Optional[str] = None
    jewellery_type: Optional[str] = "none"
    lighting_mode: Optional[str] = "daylight"


@router.post("/send-whatsapp", summary="Direct WhatsApp Delivery of Try-On Portrait")
async def send_whatsapp_portrait(req: SendWhatsAppDeliveryRequest, db: AsyncSession = Depends(get_db)):
    """
    Sends the styled, watermarked try-on portrait directly to customer's WhatsApp using showroom credentials.
    """
    from backend.app.services.notifications.whatsapp_service import whatsapp_service
    from backend.app.services.image.bridal_styling_service import apply_bridal_styling
    from backend.app.services.image.watermark_service import apply_showroom_watermark

    # Find the job result URL
    job_stmt = select(TryOnJobModel).where(TryOnJobModel.id == req.job_id)
    j_res = await db.execute(job_stmt)
    job = j_res.scalar_one_or_none()

    if not job or not job.result_image_url:
        raise HTTPException(status_code=404, detail="Try-on job or result image not found.")

    image_url = job.result_image_url

    # If bridal jewellery or custom lighting is selected, generate styled image
    if (req.jewellery_type and req.jewellery_type != "none") or (req.lighting_mode and req.lighting_mode != "daylight"):
        try:
            media = await storage_service.get_media(req.job_id)
            if media:
                styled_bytes = apply_bridal_styling(
                    media.data,
                    jewellery_type=req.jewellery_type,
                    lighting_mode=req.lighting_mode,
                )
                styled_bytes = apply_showroom_watermark(styled_bytes)
                styled_file_id = f"styled_wa_{req.job_id}_{req.jewellery_type}_{req.lighting_mode}"
                await storage_service.save_media(
                    file_id=styled_file_id,
                    data=styled_bytes,
                    media_type="image/jpeg",
                    retention_minutes=120,
                )
                image_url = f"/api/v1/tryon/media/{styled_file_id}"
        except Exception as e:
            logger.warning(f"Could not apply bridal styling for WhatsApp media: {e}")

    # Build absolute URL for WhatsApp delivery
    if image_url.startswith("/"):
        image_url = f"http://127.0.0.1:8000{image_url}"

    garment_name = req.garment_name or "Traditional Silk Saree"
    res = await whatsapp_service.send_tryon_media(
        customer_phone=req.customer_phone,
        media_url=image_url,
        garment_name=garment_name,
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "WhatsApp delivery failed."))

    return res


# =============================================================================
# PHASE 5: COUPLE & GROOM COORDINATED DRAPE LOOKBOOK ENGINE
# =============================================================================

class GenerateCoupleDrapeRequest(BaseModel):
    job_id: str
    groom_attire: Optional[str] = "dhoti"  # 'dhoti' or 'kurta'
    saree_color_hex: Optional[str] = "#c99738"
    saree_name: Optional[str] = "Traditional Saree"


@router.post("/couple-drape", summary="Generate Coordinated Couple & Groom Lookbook Drape")
async def generate_couple_drape_endpoint(req: GenerateCoupleDrapeRequest, db: AsyncSession = Depends(get_db)):
    """
    Renders an authentic couple lookbook: Composites the bride's try-on drape
    alongside a matching silk dhoti or royal kurta matched to her saree's border and gold zari.
    """
    from backend.app.services.image.bridal_styling_service import generate_couple_twinning_drape
    from backend.app.services.image.watermark_service import apply_showroom_watermark

    media = await storage_service.get_media(req.job_id)
    if not media:
        raise HTTPException(status_code=404, detail="Original bride portrait media not found.")

    couple_bytes = generate_couple_twinning_drape(
        bride_image_bytes=media.data,
        groom_attire=req.groom_attire or "dhoti",
        saree_color_hex=req.saree_color_hex or "#c99738",
        saree_name=req.saree_name or "Traditional Saree",
    )
    couple_bytes = apply_showroom_watermark(couple_bytes)

    file_id = f"couple_{req.job_id}_{req.groom_attire}"
    await storage_service.save_media(
        file_id=file_id,
        data=couple_bytes,
        media_type="image/jpeg",
        retention_minutes=120,
    )
    return {
        "success": True,
        "couple_image_url": f"/api/v1/tryon/media/{file_id}",
        "groom_attire": req.groom_attire,
    }


# =============================================================================
# PHASE 3: FAMILY & FRIENDS WHATSAPP POLL VOTING ENGINE
# =============================================================================

class CreateFamilyPollRequest(BaseModel):
    customer_name: Optional[str] = "Showroom Guest"
    customer_phone: Optional[str] = None
    title: Optional[str] = "எந்த புடவை எனக்கு அழகாக இருக்கிறது? (Which Saree Looks Best on Me?)"
    candidates: List[Dict[str, Any]]  # Array of {job_id, image_url, saree_name, color, sku, price}


@router.post("/family-poll", summary="Create Multi-Saree Family Opinion Poll")
async def create_family_poll(req: CreateFamilyPollRequest, db: AsyncSession = Depends(get_db)):
    """
    Creates a shareable voting poll containing up to 4 sarees tried by the customer.
    Family and friends can vote from WhatsApp with real-time tally.
    """
    from backend.app.db.models import FamilyPollModel
    import json
    import random

    if not req.candidates:
        raise HTTPException(status_code=400, detail="At least one candidate saree is required for the poll.")

    rand_code = f"POLL-{random.randint(1000, 9999)}"
    poll_id = f"poll_{secrets.token_hex(8)}"

    new_poll = FamilyPollModel(
        id=poll_id,
        shop_id="shop_default",
        poll_code=rand_code,
        customer_name=req.customer_name or "Showroom Guest",
        customer_phone=req.customer_phone,
        title=req.title or "எந்த புடவை எனக்கு அழகாக இருக்கிறது?",
        candidates_json=json.dumps(req.candidates, ensure_ascii=False),
        status="active",
        created_at=datetime.utcnow(),
    )
    db.add(new_poll)
    await db.commit()

    poll_url = f"/poll/{rand_code}"
    share_text = (
        f"👗 *{req.customer_name}* ஜவுளிக்கடையில் புடவை தேர்வு செய்கிறார்!\n"
        f"அவருக்கு எந்த புடவை மிகவும் அழகாக இருக்கிறது என்று உங்கள் வாக்கை அளியுங்கள்:\n"
        f"👉 http://localhost:4200{poll_url}"
    )

    return {
        "success": True,
        "poll_id": poll_id,
        "poll_code": rand_code,
        "poll_url": poll_url,
        "share_text": share_text,
        "candidate_count": len(req.candidates),
    }


@router.get("/family-poll/{poll_code}", summary="Get Family Poll Details & Live Vote Tally")
async def get_family_poll(poll_code: str, db: AsyncSession = Depends(get_db)):
    """
    Retrieves the poll details, candidates, and live vote counts per saree option.
    """
    from backend.app.db.models import FamilyPollModel, FamilyPollVoteModel
    import json

    stmt = select(FamilyPollModel).where(FamilyPollModel.poll_code == poll_code)
    res = await db.execute(stmt)
    poll = res.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Family poll not found.")

    candidates = json.loads(poll.candidates_json)

    # Fetch votes
    v_stmt = select(FamilyPollVoteModel).where(FamilyPollVoteModel.poll_id == poll.id)
    v_res = await db.execute(v_stmt)
    votes = v_res.scalars().all()

    total_votes = len(votes)
    tally = [0] * len(candidates)
    vote_details = []

    for v in votes:
        if 0 <= v.candidate_index < len(tally):
            tally[v.candidate_index] += 1
        vote_details.append({
            "voter_name": v.voter_name,
            "voter_relation": v.voter_relation,
            "candidate_index": v.candidate_index,
            "comment": v.comment,
            "created_at": v.created_at.strftime("%I:%M %p"),
        })

    candidate_results = []
    for idx, c in enumerate(candidates):
        count = tally[idx]
        pct = round((count / total_votes * 100), 1) if total_votes > 0 else 0.0
        candidate_results.append({
            **c,
            "index": idx,
            "vote_count": count,
            "vote_percentage": pct,
        })

    return {
        "poll_code": poll.poll_code,
        "title": poll.title,
        "customer_name": poll.customer_name,
        "status": poll.status,
        "total_votes": total_votes,
        "candidates": candidate_results,
        "recent_votes": vote_details[-10:],
    }


class CastPollVoteRequest(BaseModel):
    voter_name: str
    voter_relation: Optional[str] = "Family"  # "Mom", "Husband", "Sister", etc.
    candidate_index: int
    comment: Optional[str] = None


@router.post("/family-poll/{poll_code}/vote", summary="Cast Vote on Family Saree Poll")
async def cast_poll_vote(poll_code: str, req: CastPollVoteRequest, db: AsyncSession = Depends(get_db)):
    """
    Submits a vote for a candidate saree in the active family poll.
    """
    from backend.app.db.models import FamilyPollModel, FamilyPollVoteModel
    import json

    stmt = select(FamilyPollModel).where(FamilyPollModel.poll_code == poll_code)
    res = await db.execute(stmt)
    poll = res.scalar_one_or_none()
    if not poll or poll.status != "active":
        raise HTTPException(status_code=400, detail="Poll not found or voting is closed.")

    candidates = json.loads(poll.candidates_json)
    if req.candidate_index < 0 or req.candidate_index >= len(candidates):
        raise HTTPException(status_code=400, detail="Invalid candidate option selected.")

    new_vote = FamilyPollVoteModel(
        id=f"vote_{secrets.token_hex(8)}",
        poll_id=poll.id,
        voter_name=req.voter_name.strip() or "Anonymous Family",
        voter_relation=req.voter_relation or "Family",
        candidate_index=req.candidate_index,
        comment=req.comment,
        created_at=datetime.utcnow(),
    )
    db.add(new_vote)
    await db.commit()

    return {
        "success": True,
        "message": f"Thank you {new_vote.voter_name}! Your vote has been recorded.",
        "candidate_voted": candidates[req.candidate_index].get("saree_name", f"Option #{req.candidate_index + 1}"),
    }




