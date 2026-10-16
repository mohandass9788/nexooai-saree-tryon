from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel


class TryOnEngineResult(BaseModel):
    status: str  # "completed", "processing", "failed"
    provider_name: str
    provider_job_id: str
    result_image_bytes: Optional[bytes] = None
    processing_time_ms: int = 0
    estimated_cost_usd: float = 0.0
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class BaseTryOnEngine(ABC):
    @abstractmethod
    async def process_tryon(
        self,
        person_image_bytes: bytes,
        saree_image_bytes: bytes,
        options: Optional[Dict[str, Any]] = None,
    ) -> TryOnEngineResult:
        """
        Process a virtual try-on request with the person and saree image.
        Returns a TryOnEngineResult.
        """
        pass
