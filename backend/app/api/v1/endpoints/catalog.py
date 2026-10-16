import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from backend.app.db.session import get_db
from backend.app.db.models import ProductModel, CategoryModel
from backend.app.schemas.catalog import CatalogResponse, SareeItem, CategoryListResponse, CategoryItem

logger = logging.getLogger("catalog")
router = APIRouter()

# Seed catalog for showroom display
SAMPLE_SAREES = [
    SareeItem(
        id="saree_001",
        sku="KAN-SILK-001",
        name_en="Kanchipuram Pure Silk Bridal Saree",
        name_ta="காஞ்சிபுரம் தூய பட்டு திருமண புடவை",
        category="Bridal Silk",
        fabric="Mulberry Silk",
        color="Crimson Red & Gold",
        price=18500.00,
        description_en="Handwoven pure mulberry silk with traditional temple zari border.",
        description_ta="பாரம்பரிய கோவில் ஜரி பார்டருடன் கூடிய கைத்தறி தூய மல்பெரி பட்டு.",
        primary_image_url="/static/sarees/kan-silk-001.jpg",
        pallu_type="Heavy Gold Zari",
        is_active=True,
    ),
    SareeItem(
        id="saree_002",
        sku="BAN-SILK-002",
        name_en="Banarasi Brocade Floral Saree",
        name_ta="பனாரசி ப்ரோகேட் மலர் வேலைப்பாடு புடவை",
        category="Banarasi Silk",
        fabric="Katan Silk",
        color="Royal Emerald Green",
        price=14200.00,
        description_en="Rich silver and gold zari work with opulent floral motifs.",
        description_ta="செழுமையான வெள்ளி மற்றும் தங்க ஜரி வேலைப்பாடு கொண்ட ஆடம்பர புடவை.",
        primary_image_url="/static/sarees/ban-silk-002.jpg",
        pallu_type="Intricate Kadwa Brocade",
        is_active=True,
    ),
    SareeItem(
        id="saree_003",
        sku="CHT-COT-003",
        name_en="Traditional Chettinad Cotton Saree",
        name_ta="பாரம்பரிய செட்டிநாடு பருத்தி புடவை",
        category="Handloom Cotton",
        fabric="Organic Cotton",
        color="Mustard Yellow & Maroon",
        price=3200.00,
        description_en="Comfortable breathable handloom cotton with contrasting temple border.",
        description_ta="கோவில் பார்டருடன் கூடிய வசதியான சுவாசிக்கக்கூடிய கைத்தறி பருத்தி.",
        primary_image_url="/static/sarees/cht-cot-003.jpg",
        pallu_type="Striped Zari Accent",
        is_active=True,
    ),
    SareeItem(
        id="saree_004",
        sku="MYS-SILK-004",
        name_en="Mysore Crepe Silk Saree",
        name_ta="மைசூர் க்ரேப் பட்டு புடவை",
        category="Silk Sarees",
        fabric="Crepe Silk",
        color="Deep Sapphire Blue",
        price=11800.00,
        description_en="Smooth lightweight drape with pure gold lace border.",
        description_ta="தூய தங்க லேஸ் பார்டருடன் கூடிய மென்மையான லேசான புடவை.",
        primary_image_url="/static/sarees/mys-silk-004.jpg",
        pallu_type="Classic Solid Zari Border",
        is_active=True,
    ),
    SareeItem(
        id="apparel_005",
        sku="W-CHUDI-005",
        name_en="Embroidered Chanderi Silk Chudidhar Set",
        name_ta="எம்பிராய்டரி சந்தேரி பட்டு சுடிதார் செட்",
        category="Women Chudidhar",
        fabric="Chanderi Silk",
        color="Rose Gold & Pink",
        price=5400.00,
        description_en="Elegant festive chudidhar with zari embroidery and organza dupatta.",
        description_ta="ஜரி வேலைப்பாடு மற்றும் துப்பட்டாவுடன் கூடிய அழகான பண்டிகை சுடிதார்.",
        primary_image_url="/static/sarees/w-chudi-005.jpg",
        pallu_type="Embroidered Dupatta",
        is_active=True,
    ),
    SareeItem(
        id="apparel_006",
        sku="M-SHIRT-006",
        name_en="Tailored Indigo Chambray Cotton Shirt",
        name_ta="நேர்த்தியான இண்டிகோ காட்டன் சட்டை",
        category="Men Shirts",
        fabric="100% Breathable Cotton Chambray",
        color="Indigo Blue",
        price=2499.00,
        description_en="Contemporary slim-fit breathable pure cotton shirt with spread collar and printed accents.",
        description_ta="தினசரி பயன்பாடு மற்றும் பண்டிகைகளுக்கு ஏற்ற உயர்தர மென்மையான இண்டிகோ காட்டன் சட்டை.",
        primary_image_url="/static/sarees/m-dhoti-006.jpg",
        pallu_type="Spread Collar Spread",
        is_active=True,
    ),
    SareeItem(
        id="apparel_007",
        sku="M-SUIT-007",
        name_en="Royal Navy Blue Slim-Fit Formal Blazer",
        name_ta="ராயல் நேவி ப்ளூ பிரீமியம் பிளேசர் சூட்",
        category="Men Suits",
        fabric="Wool Blend Structure",
        color="Royal Navy Blue",
        price=5999.00,
        description_en="Modern tailored Italian-inspired navy blue single-breasted blazer with peaked lapels.",
        description_ta="நவீன திருமண மற்றும் வரவேற்பு நிகழ்வுகளுக்கான நேர்த்தியான ராயல் நேவி ப்ளூ பிளேசர் சூட்.",
        primary_image_url="/static/sarees/m-kurta-007.jpg",
        pallu_type="Notch Lapel Tailoring",
        is_active=True,
    ),
    SareeItem(
        id="apparel_008",
        sku="K-PAVAD-008",
        name_en="Kids Traditional Pure Silk Pattu Pavadai",
        name_ta="சிறுமி பாரம்பரிய தூய பட்டுப் பாவாடை சட்டை",
        category="Kids Ethnic",
        fabric="Kanchipuram Silk",
        color="Peacock Blue & Gold",
        price=3900.00,
        description_en="Vibrant pure silk pattu pavadai with traditional peacock motifs.",
        description_ta="மயில் மோடிஃப்களுடன் கூடிய கண்கவர் தூய பட்டுப் பாவாடை சட்டை.",
        primary_image_url="/static/sarees/k-pavad-008.jpg",
        pallu_type="Traditional Temple Border",
        is_active=True,
    ),
    SareeItem(
        id="apparel_009",
        sku="M-DHOTI-009",
        name_en="Traditional Pure Silk Dhoti & Angavastram",
        name_ta="பாரம்பரிய தூய பட்டு வேட்டி & அங்கவஸ்திரம்",
        category="Men Dhoti",
        fabric="Pure Mulberry Silk",
        color="Ivory White & Gold Zari",
        price=7800.00,
        description_en="Authentic handloom wedding dhoti with rich pure gold zari border and matching sash.",
        description_ta="செழுமையான தங்க ஜரி பார்டருடன் கூடிய பாரம்பரிய திருமண பட்டு வேட்டி மற்றும் அங்கவஸ்திரம்.",
        primary_image_url="/static/sarees/m-dhoti-009.jpg",
        pallu_type="Gold Mayil Zari Border",
        is_active=True,
    ),
]


@router.get("/categories/list", response_model=CategoryListResponse, summary="List Garment Categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Fetch all active apparel categories from database."""
    try:
        res = await db.execute(
            select(CategoryModel).where(CategoryModel.is_active == True).order_by(CategoryModel.display_order)
        )
        categories = res.scalars().all()
        if categories:
            items = [
                CategoryItem(
                    id=c.id,
                    name_en=c.name_en,
                    name_ta=c.name_ta,
                    slug=c.slug,
                    display_order=c.display_order,
                    is_active=c.is_active,
                )
                for c in categories
            ]
            return CategoryListResponse(categories=items, total=len(items))
    except Exception as e:
        logger.warning(f"Error querying categories: {e}")

    return CategoryListResponse(categories=[], total=0)


@router.get("", response_model=CatalogResponse, summary="List Saree Catalogue")
async def get_catalogue(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    try:
        stmt = select(ProductModel).where(ProductModel.is_active == True)
        if category:
            cat_filter = f"%{category.lower()}%"
            stmt = stmt.where(func.lower(ProductModel.category).like(cat_filter))

        if search:
            s_filter = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(ProductModel.name_en).like(s_filter),
                    func.lower(ProductModel.name_ta).like(s_filter),
                    func.lower(ProductModel.sku).like(s_filter),
                )
            )

        # Count total items matching filter
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Paginate results
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)
        res = await db.execute(stmt)
        db_products = res.scalars().all()

        items = [
            SareeItem(
                id=p.id,
                sku=p.sku,
                name_en=p.name_en,
                name_ta=p.name_ta,
                category=p.category,
                fabric=p.fabric,
                color=p.color,
                price=p.price,
                description_en=p.description_en,
                description_ta=p.description_ta,
                primary_image_url=p.primary_image_url,
                pallu_type=p.pallu_type,
                is_active=p.is_active,
            )
            for p in db_products
        ]
        return CatalogResponse(
            items=items,
            total=total,
            page=page,
            pages=max(1, (total + limit - 1) // limit),
        )
    except Exception as e:
        logger.warning(f"Error querying database for catalog: {e}")

    # Fallback to SAMPLE_SAREES only if database connection failed
    results = [s for s in SAMPLE_SAREES if s.is_active]
    if category:
        cat_lower = category.lower()
        results = [s for s in results if cat_lower in s.category.lower()]

    if search:
        s_lower = search.lower()
        results = [
            s for s in results
            if s_lower in s.name_en.lower() or s_lower in s.name_ta.lower() or s_lower in s.sku.lower()
        ]

    total = len(results)
    start = (page - 1) * limit
    paginated_items = results[start : start + limit]

    return CatalogResponse(
        items=paginated_items,
        total=total,
        page=page,
        pages=max(1, (total + limit - 1) // limit),
    )


@router.get("/search/similar", summary="Semantic Vector Search for Similar Garments")
async def search_similar_garments(
    q: Optional[str] = Query(None, description="Query terms or garment description for vector similarity"),
    query: Optional[str] = Query(None, description="Alternative alias for query text"),
    limit: int = Query(4, ge=1, le=20),
    top_k: Optional[int] = Query(None, ge=1, le=20),
):
    from backend.app.services.vector.search import vector_search_service
    search_text = q or query or "silk saree"
    k = top_k or limit or 4
    return vector_search_service.search_similar(query_text=search_text, top_k=k)


@router.get("/{saree_id}", response_model=SareeItem, summary="Get Saree by ID")
async def get_saree_detail(saree_id: str, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(ProductModel).where(
            or_(
                ProductModel.id == saree_id,
                func.lower(ProductModel.sku) == saree_id.lower(),
            )
        )
        res = await db.execute(stmt)
        p = res.scalar_one_or_none()
        if p:
            return SareeItem(
                id=p.id,
                sku=p.sku,
                name_en=p.name_en,
                name_ta=p.name_ta,
                category=p.category,
                fabric=p.fabric,
                color=p.color,
                price=p.price,
                description_en=p.description_en,
                description_ta=p.description_ta,
                primary_image_url=p.primary_image_url,
                pallu_type=p.pallu_type,
                is_active=p.is_active,
            )
    except Exception as e:
        logger.warning(f"Error querying database for saree {saree_id}: {e}")

    for saree in SAMPLE_SAREES:
        if saree.id == saree_id or saree.sku.lower() == saree_id.lower():
            return saree
    raise HTTPException(status_code=404, detail="Saree not found in catalogue")

