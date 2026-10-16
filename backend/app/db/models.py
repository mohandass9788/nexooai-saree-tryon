from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class ShopModel(Base):
    __tablename__ = "shops"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    logo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    branches = relationship("BranchModel", back_populates="shop")
    categories = relationship("CategoryModel", back_populates="shop")


class BranchModel(Base):
    __tablename__ = "branches"

    id = Column(String(64), primary_key=True, index=True)
    shop_id = Column(String(64), ForeignKey("shops.id"), nullable=True)
    branch_name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("ShopModel", back_populates="branches")
    kiosks = relationship("KioskModel", back_populates="branch")


class KioskModel(Base):
    __tablename__ = "kiosks"

    id = Column(String(64), primary_key=True, index=True)
    branch_id = Column(String(64), ForeignKey("branches.id"), nullable=True)
    kiosk_code = Column(String(64), unique=True, index=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    status = Column(String(32), default="online", index=True)  # "online", "idle", "maintenance"
    device_ip = Column(String(64), nullable=True)
    last_ping_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("BranchModel", back_populates="kiosks")


class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(String(64), primary_key=True, index=True)
    shop_id = Column(String(64), ForeignKey("shops.id"), nullable=True)
    name_en = Column(String(255), nullable=False)
    name_ta = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("ShopModel", back_populates="categories")
    products = relationship("ProductModel", back_populates="category_rel")


class ProductModel(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, index=True)
    category_id = Column(String(64), ForeignKey("categories.id"), nullable=True)
    sku = Column(String(64), unique=True, index=True, nullable=False)
    name_en = Column(String(255), nullable=False)
    name_ta = Column(String(255), nullable=False)
    category = Column(String(100), index=True, nullable=False)
    fabric = Column(String(100), nullable=True)
    color = Column(String(100), nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    description_en = Column(Text, nullable=True)
    description_ta = Column(Text, nullable=True)
    primary_image_url = Column(String(500), nullable=False)
    pallu_type = Column(String(150), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category_rel = relationship("CategoryModel", back_populates="products")
    images = relationship("ProductImageModel", back_populates="product")
    tryon_jobs = relationship("TryOnJobModel", back_populates="product")


class ProductImageModel(Base):
    __tablename__ = "product_images"

    id = Column(String(64), primary_key=True, index=True)
    product_id = Column(String(64), ForeignKey("products.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    suitability_status = Column(String(50), default="suitable")  # "suitable", "low_contrast", etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("ProductModel", back_populates="images")


class TryOnSessionModel(Base):
    __tablename__ = "tryon_sessions"

    id = Column(String(64), primary_key=True, index=True)
    kiosk_id = Column(String(64), ForeignKey("kiosks.id"), nullable=True)
    language = Column(String(10), default="ta")
    consent_accepted = Column(Boolean, default=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)


class TryOnJobModel(Base):
    __tablename__ = "tryon_jobs"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("tryon_sessions.id"), nullable=True)
    product_id = Column(String(64), ForeignKey("products.id"), nullable=False)
    kiosk_id = Column(String(64), nullable=True)
    status = Column(String(32), index=True, nullable=False, default="pending")
    provider = Column(String(32), nullable=False, default="gemini")
    person_image_path = Column(String(500), nullable=True)
    result_image_path = Column(String(500), nullable=True)
    download_token = Column(String(128), unique=True, index=True, nullable=True)
    download_token_expires_at = Column(DateTime, nullable=True)
    processing_time_ms = Column(Integer, default=0)
    estimated_cost_usd = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("ProductModel", back_populates="tryon_jobs")
    tokens = relationship("DownloadTokenModel", back_populates="job")


class DownloadTokenModel(Base):
    __tablename__ = "download_tokens"

    id = Column(String(64), primary_key=True, index=True)
    job_id = Column(String(64), ForeignKey("tryon_jobs.id"), nullable=False)
    raw_token = Column(String(128), index=True, nullable=False)
    token_hash = Column(String(128), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    download_count = Column(Integer, default=0)
    max_downloads = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("TryOnJobModel", back_populates="tokens")


class AdminUserModel(Base):
    __tablename__ = "admin_users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="store_manager")  # "super_admin", "store_manager"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit_logs = relationship("AuditLogModel", back_populates="admin_user")


class ConsentAuditModel(Base):
    __tablename__ = "consent_audits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), index=True, nullable=False)
    kiosk_id = Column(String(64), nullable=True)
    consent_confirmed = Column(Boolean, nullable=False, default=False)
    language = Column(String(10), default="ta")
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    admin_user_id = Column(String(64), ForeignKey("admin_users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    admin_user = relationship("AdminUserModel", back_populates="audit_logs")


class SystemSettingModel(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
