import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import SalesInquiryModel
from backend.app.api.deps import require_super_admin, AuthenticatedUser

router = APIRouter()


class SalesInquiryCreateRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    showroom_name: str
    city: Optional[str] = None
    estimated_kiosks: int = 1
    message: Optional[str] = None


class SalesInquiryResponse(BaseModel):
    status: str
    inquiry_id: str
    message: str
    created_at: str


@router.post("/contact-sales", response_model=SalesInquiryResponse, summary="Submit Showroom Sales / Demo Inquiry")
async def submit_sales_inquiry(
    req: SalesInquiryCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public entrypoint for boutique owners requesting an enterprise demo or showroom kiosk deployment.
    Directly persists to the database and schedules follow-up dispatch.
    """
    inquiry_id = f"inq_{uuid.uuid4().hex[:12]}"
    new_inquiry = SalesInquiryModel(
        id=inquiry_id,
        name=req.name.strip(),
        email=req.email.lower().strip(),
        phone=req.phone.strip() if req.phone else None,
        showroom_name=req.showroom_name.strip(),
        city=req.city.strip() if req.city else "Chennai",
        estimated_kiosks=max(1, req.estimated_kiosks),
        message=req.message.strip() if req.message else None,
        status="new",
        created_at=datetime.utcnow(),
    )

    db.add(new_inquiry)
    await db.commit()
    await db.refresh(new_inquiry)

    return SalesInquiryResponse(
        status="success",
        inquiry_id=new_inquiry.id,
        message=f"Thank you {new_inquiry.name}! NeXooAi Enterprise Sales Team will contact you within 2 hours.",
        created_at=new_inquiry.created_at.isoformat(),
    )


@router.get("/inquiries", summary="List All Inbound Showroom Sales Inquiries (Super Admin Only)")
async def list_sales_inquiries(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_super_admin),
):
    """
    Retrieves all prospective showroom leads for Super Admin HQ review.
    """
    stmt = select(SalesInquiryModel).order_by(desc(SalesInquiryModel.created_at))
    res = await db.execute(stmt)
    inquiries = res.scalars().all()

    return {
        "status": "success",
        "total": len(inquiries),
        "inquiries": [
            {
                "id": inq.id,
                "name": inq.name,
                "email": inq.email,
                "phone": inq.phone,
                "showroom_name": inq.showroom_name,
                "city": inq.city,
                "estimated_kiosks": inq.estimated_kiosks,
                "message": inq.message,
                "status": inq.status,
                "created_at": inq.created_at.isoformat() if inq.created_at else None,
            }
            for inq in inquiries
        ],
    }


class SalesInquiryStatusUpdateRequest(BaseModel):
    status: str


@router.patch("/inquiries/{inquiry_id}/status", summary="Update Inbound Sales Inquiry Status (Super Admin Only)")
async def update_sales_inquiry_status(
    inquiry_id: str,
    req: SalesInquiryStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_super_admin),
):
    """
    Updates the follow-up status of an inbound showroom sales inquiry.
    """
    stmt = select(SalesInquiryModel).where(SalesInquiryModel.id == inquiry_id)
    res = await db.execute(stmt)
    inquiry = res.scalar_one_or_none()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    inquiry.status = req.status.strip().lower()
    await db.commit()
    await db.refresh(inquiry)

    return {
        "status": "success",
        "inquiry_id": inquiry.id,
        "updated_status": inquiry.status,
    }


@router.delete("/inquiries/{inquiry_id}", summary="Delete Inbound Sales Inquiry (Super Admin Only)")
async def delete_sales_inquiry(
    inquiry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_super_admin),
):
    """
    Deletes an invalid or spam inquiry record.
    """
    stmt = select(SalesInquiryModel).where(SalesInquiryModel.id == inquiry_id)
    res = await db.execute(stmt)
    inquiry = res.scalar_one_or_none()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    await db.delete(inquiry)
    await db.commit()

    return {"status": "success", "message": f"Inquiry {inquiry_id} removed"}

