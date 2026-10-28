"""
B2B Multi-Tenant Catalog Ingestion API.
Allows onboarded boutique clients to programmatically synchronize their private inventory
via REST API or by providing an external JSON Feed URL.
"""

import logging
import secrets
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Query, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import httpx

from backend.app.db.session import get_db
from backend.app.db.models import ShopModel, ProductModel, CategoryModel

logger = logging.getLogger("tenant_catalog")
router = APIRouter()


class TenantProductItemDTO(BaseModel):
    sku: str = Field(..., description="Unique Stock Keeping Unit (e.g. KAN-SILK-101)")
    name_en: str = Field(..., description="Product title in English")
    name_ta: Optional[str] = Field(None, description="Product title in Tamil")
    category: str = Field("Bridal Silk", description="Category (Bridal Silk, Banarasi, Cotton, etc.)")
    fabric: Optional[str] = Field("Pure Mulberry Silk", description="Fabric material")
    color: Optional[str] = Field("Crimson Red", description="Color or hue name")
    price: float = Field(..., description="Retail price in INR")
    primary_image_url: str = Field(..., description="Direct high-res image URL (9:16 preferred)")
    rack_location: Optional[str] = Field("Section A — Rack 01", description="Physical floor rack position")
    description_en: Optional[str] = Field(None, description="Product details in English")
    description_ta: Optional[str] = Field(None, description="Product details in Tamil")
    pallu_type: Optional[str] = Field("Zari Brocade", description="Pallu design style")


class CatalogSyncBatchRequest(BaseModel):
    replace_existing: bool = Field(False, description="If true, clears old catalogue before syncing")
    products: List[TenantProductItemDTO] = Field(..., min_items=1, description="List of garment products to sync")


class CatalogImportUrlRequest(BaseModel):
    feed_url: str = Field(..., description="Public or authenticated JSON URL containing list of products")
    replace_existing: bool = Field(False, description="If true, clears old catalogue before syncing")


async def get_shop_by_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    api_key: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> ShopModel:
    """Authenticates the boutique client using their private tenant API key via secure headers."""
    from backend.app.core.config import settings

    key = x_api_key
    if not key and authorization and authorization.lower().startswith("bearer "):
        key = authorization[7:].strip()

    if not key and api_key:
        if settings.APP_ENV == "production":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passing API keys in URL query parameters is prohibited in production. Use the 'X-API-Key' HTTP header.",
            )
        key = api_key

    if not key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Tenant API Key. Provide via 'X-API-Key' header.",
        )

    res = await db.execute(select(ShopModel).where(ShopModel.api_key == key.strip()))
    shop = res.scalar_one_or_none()
    if not shop or not shop.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive Tenant API Key. Please verify with your NeXooAi Admin.",
        )
    return shop


@router.post("/sync", summary="Push Private Catalog Feed via JSON API")
async def sync_tenant_catalog(
    req: CatalogSyncBatchRequest,
    shop: ShopModel = Depends(get_shop_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Direct Programmatic Ingestion:
    Boutique ERPs, Shopify, WooCommerce, or custom inventory servers can POST their
    catalogue here to instantly load virtual try-on items.
    """
    if req.replace_existing:
        await db.execute(delete(ProductModel).where(ProductModel.category_id == None))  # or filtered by shop

    synced_count = 0
    updated_count = 0

    for item in req.products:
        res = await db.execute(select(ProductModel).where(ProductModel.sku == item.sku))
        existing = res.scalar_one_or_none()

        name_ta = item.name_ta or item.name_en
        desc_en = item.description_en or item.name_en
        desc_ta = item.description_ta or name_ta

        if existing:
            existing.name_en = item.name_en
            existing.name_ta = name_ta
            existing.category = item.category
            existing.fabric = item.fabric
            existing.color = item.color
            existing.price = item.price
            existing.primary_image_url = item.primary_image_url
            existing.rack_location = item.rack_location or "Section A — Rack 01"
            existing.description_en = desc_en
            existing.description_ta = desc_ta
            existing.pallu_type = item.pallu_type
            updated_count += 1
        else:
            new_prod = ProductModel(
                id=f"prod_{secrets.token_hex(8)}",
                sku=item.sku,
                name_en=item.name_en,
                name_ta=name_ta,
                category=item.category,
                fabric=item.fabric,
                color=item.color,
                price=item.price,
                primary_image_url=item.primary_image_url,
                rack_location=item.rack_location or "Section A — Rack 01",
                description_en=desc_en,
                description_ta=desc_ta,
                pallu_type=item.pallu_type,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(new_prod)
            synced_count += 1

    shop.last_catalog_sync_at = datetime.utcnow()
    await db.commit()

    return {
        "success": True,
        "shop_id": shop.id,
        "shop_name": shop.name,
        "inserted_products": synced_count,
        "updated_products": updated_count,
        "total_processed": len(req.products),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/import-url", summary="Ingest Catalog from External JSON URL")
async def import_tenant_catalog_url(
    req: CatalogImportUrlRequest,
    shop: ShopModel = Depends(get_shop_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    URL Ingestion:
    Fetches garments from an external boutique JSON Feed URL and synchronizes items into the kiosk catalog.
    """
    url = req.feed_url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol. Must start with http:// or https://")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"External server returned HTTP status {resp.status_code}",
                )
            data = resp.json()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch or parse JSON from external URL: {str(e)}",
        )

    # Extract product array
    items_raw = data.get("products") or data.get("items") or data.get("data") or (data if isinstance(data, list) else [])
    if not isinstance(items_raw, list) or len(items_raw) == 0:
        raise HTTPException(
            status_code=400,
            detail="JSON feed does not contain a valid list of products (expected 'products' array).",
        )

    parsed_items = []
    for idx, p in enumerate(items_raw):
        if not isinstance(p, dict):
            continue
        sku = str(p.get("sku") or p.get("id") or f"FEED-{idx+1001}")
        name = str(p.get("name") or p.get("title") or p.get("name_en") or "Silk Saree")
        img = str(p.get("image") or p.get("image_url") or p.get("primary_image_url") or "/static/benchmark_model.jpg")
        price = float(p.get("price") or 9999.0)
        parsed_items.append(
            TenantProductItemDTO(
                sku=sku,
                name_en=name,
                name_ta=p.get("name_ta") or name,
                category=p.get("category") or "Bridal Silk",
                fabric=p.get("fabric") or "Silk",
                color=p.get("color") or "Royal Gold",
                price=price,
                primary_image_url=img,
                rack_location=p.get("rack_location") or "Section A — Rack 01",
                description_en=p.get("description") or name,
            )
        )

    batch_req = CatalogSyncBatchRequest(replace_existing=req.replace_existing, products=parsed_items)
    shop.catalog_feed_url = url
    return await sync_tenant_catalog(batch_req, shop, db)


@router.get("/feed-sample", summary="Sample JSON Feed Specification for Boutiques")
async def get_sample_feed():
    """Returns sample JSON format so boutique developers know how to format their inventory feed."""
    return {
        "status": "success",
        "documentation": "Send this JSON structure to POST /api/v1/tenant/catalog/sync with header X-API-Key",
        "products": [
            {
                "sku": "KAN-SILK-101",
                "name_en": "Kanchipuram Crimson Royal Bridal Silk",
                "name_ta": "காஞ்சிபுரம் முகூர்த்த பட்டுப்புடவை",
                "category": "Bridal Silk",
                "fabric": "Pure Mulberry Silk",
                "color": "Crimson Red & Antique Gold",
                "price": 28500.0,
                "primary_image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c",
                "rack_location": "Section A — Rack 04",
                "pallu_type": "Grand Zari Brocade",
                "description_en": "Handwoven traditional Kanchipuram silk saree with intricate peacock motifs."
            },
            {
                "sku": "BAN-SILK-202",
                "name_en": "Banarasi Katan Silk Gold Kadwa Weave",
                "name_ta": "பனாரசி கடான் பட்டுப் புடவை",
                "category": "Banarasi Silk",
                "fabric": "Katan Silk",
                "color": "Royal Emerald Green",
                "price": 34000.0,
                "primary_image_url": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb",
                "rack_location": "Section B — Rack 02",
                "pallu_type": "Gold Floral Kadwa",
                "description_en": "Authentic Banarasi handloom silk with gold zari borders."
            }
        ]
    }
