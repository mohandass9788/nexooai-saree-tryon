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

# Clean production catalogue: Populated from Database & Admin Uploads
SAMPLE_SAREES: list[SareeItem] = []

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

    # Clean production empty response if no sarees found
    return CatalogResponse(items=[], total=0, page=page, pages=1)
    results = []
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

