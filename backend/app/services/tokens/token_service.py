import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from pydantic import BaseModel
from backend.app.core.config import settings


class TokenMetadata(BaseModel):
    raw_token: str
    token_hash: str
    job_id: str
    created_at: datetime
    expires_at: datetime
    download_count: int = 0
    max_downloads: int = 5
    is_revoked: bool = False


class TokenService:
    """
    Manages cryptographically secure, unguessable, expiring download tokens.
    Stores hashes rather than plain tokens for enhanced security.
    """

    def __init__(self, expiry_minutes: Optional[int] = None):
        self.expiry_minutes = expiry_minutes or settings.DOWNLOAD_TOKEN_EXPIRY_MINUTES
        # In-memory store; in production backed by PostgreSQL download_tokens table
        self._tokens_by_hash: Dict[str, TokenMetadata] = {}

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def create_download_token(self, job_id: str, max_downloads: int = 5) -> TokenMetadata:
        raw_token = f"tok_{secrets.token_urlsafe(32)}"
        token_hash = self._hash_token(raw_token)
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=self.expiry_minutes)

        meta = TokenMetadata(
            raw_token=raw_token,
            token_hash=token_hash,
            job_id=job_id,
            created_at=now,
            expires_at=expires_at,
            download_count=0,
            max_downloads=max_downloads,
            is_revoked=False,
        )

        self._tokens_by_hash[token_hash] = meta
        return meta

    def validate_and_consume_token(self, raw_token: str) -> Optional[TokenMetadata]:
        token_hash = self._hash_token(raw_token)
        meta = self._tokens_by_hash.get(token_hash)

        if not meta:
            return None

        now = datetime.utcnow()
        if meta.is_revoked or now > meta.expires_at:
            return None

        if meta.download_count >= meta.max_downloads:
            return None

        # Increment download usage
        meta.download_count += 1
        return meta

    def revoke_token(self, raw_token: str) -> bool:
        token_hash = self._hash_token(raw_token)
        meta = self._tokens_by_hash.get(token_hash)
        if meta:
            meta.is_revoked = True
            return True
        return False


token_service = TokenService()
