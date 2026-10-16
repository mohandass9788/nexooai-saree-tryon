import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from pathlib import Path
from backend.app.core.config import settings
from backend.app.services.storage.base import BaseStorageService, StoredMedia


class LocalStorageService(BaseStorageService):
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.STORAGE_LOCAL_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)
        # In-memory registry of media metadata
        self._registry: Dict[str, StoredMedia] = {}

    async def save_media(
        self,
        file_id: str,
        data: bytes,
        media_type: str = "image/jpeg",
        retention_hours: Optional[int] = None,
        retention_minutes: Optional[int] = None,
    ) -> StoredMedia:
        now = datetime.now(timezone.utc)
        if retention_minutes is not None:
            expires_at = now + timedelta(minutes=retention_minutes)
        else:
            hours = retention_hours if retention_hours is not None else settings.MEDIA_RETENTION_HOURS
            expires_at = now + timedelta(hours=hours)

        ext = ".jpg" if "jpeg" in media_type else ".png" if "png" in media_type else ".webp"
        file_name = f"{file_id}{ext}"
        target_path = self.base_dir / file_name

        # Write data to disk asynchronously
        target_path.write_bytes(data)

        meta = StoredMedia(
            file_id=file_id,
            file_path=str(target_path),
            media_type=media_type,
            size_bytes=len(data),
            created_at=now,
            expires_at=expires_at,
        )

        self._registry[file_id] = meta
        return meta

    async def get_media(self, file_id: str) -> Optional[bytes]:
        meta = self._registry.get(file_id)
        now = datetime.now(timezone.utc)

        if meta:
            # Check retention
            if now > meta.expires_at:
                await self.delete_media(file_id)
                return None

            path = Path(meta.file_path)
            if path.exists():
                return path.read_bytes()
            return None

        # Fallback check on filesystem
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            candidate = self.base_dir / f"{file_id}{ext}"
            if candidate.exists():
                return candidate.read_bytes()

        return None

    async def delete_media(self, file_id: str) -> bool:
        meta = self._registry.pop(file_id, None)
        deleted = False
        if meta:
            path = Path(meta.file_path)
            if path.exists():
                try:
                    path.unlink()
                    deleted = True
                except OSError:
                    pass

        # Also purge any matching files on disk
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            candidate = self.base_dir / f"{file_id}{ext}"
            if candidate.exists():
                try:
                    candidate.unlink()
                    deleted = True
                except OSError:
                    pass
        return deleted

    async def purge_expired(self) -> int:
        now = datetime.now(timezone.utc)
        expired_ids = [
            fid for fid, meta in self._registry.items() if now > meta.expires_at
        ]

        deleted_count = 0
        for fid in expired_ids:
            if await self.delete_media(fid):
                deleted_count += 1

        return deleted_count


storage_service = LocalStorageService()
