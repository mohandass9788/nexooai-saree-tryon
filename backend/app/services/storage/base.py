from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel


class StoredMedia(BaseModel):
    file_id: str
    file_path: str
    media_type: str
    size_bytes: int
    created_at: datetime
    expires_at: datetime


class BaseStorageService(ABC):
    @abstractmethod
    async def save_media(
        self,
        file_id: str,
        data: bytes,
        media_type: str,
        retention_hours: int = 24,
    ) -> StoredMedia:
        pass

    @abstractmethod
    async def get_media(self, file_id: str) -> Optional[bytes]:
        pass

    @abstractmethod
    async def delete_media(self, file_id: str) -> bool:
        pass

    @abstractmethod
    async def purge_expired(self) -> int:
        """Purges all files where expires_at < now(). Returns count of deleted files."""
        pass
