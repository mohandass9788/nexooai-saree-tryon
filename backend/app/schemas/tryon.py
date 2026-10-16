from typing import Optional
from pydantic import BaseModel, Field


class TryOnJobResponse(BaseModel):
    job_id: str
    status: str  # "completed" | "processing" | "failed"
    provider: str
    result_image_url: Optional[str] = None
    download_token: Optional[str] = None
    qr_download_url: Optional[str] = None
    processing_time_ms: int = 0
    estimated_cost_usd: float = 0.0
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class TryOnJobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress_percentage: int = 100
    created_at: str
