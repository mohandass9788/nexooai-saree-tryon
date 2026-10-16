from typing import List, Optional
from pydantic import BaseModel, Field


class SareeItem(BaseModel):
    id: str
    sku: str
    name_en: str
    name_ta: str
    category: str
    fabric: Optional[str] = None
    color: Optional[str] = None
    price: float
    description_en: Optional[str] = None
    description_ta: Optional[str] = None
    primary_image_url: str
    pallu_type: Optional[str] = "Zari Border"
    is_active: bool = True


class CatalogResponse(BaseModel):
    items: List[SareeItem]
    total: int
    page: int = 1
    pages: int = 1


class CategoryItem(BaseModel):
    id: str
    name_en: str
    name_ta: str
    slug: str
    display_order: int = 0
    is_active: bool = True


class CategoryListResponse(BaseModel):
    categories: List[CategoryItem]
    total: int
