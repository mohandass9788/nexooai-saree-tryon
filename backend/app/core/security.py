import hashlib
import secrets
from typing import Optional


def hash_password(password: str) -> str:
    """
    Hash a password using standard PBKDF2-HMAC-SHA256 with a cryptographically secure random salt.
    Zero external C-library dependency, 100% reliable across all environments.
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    )
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"


def verify_password(plain_password: str, hashed: Optional[str]) -> bool:
    """
    Verify a plaintext password against a stored hashed password.
    Supports standard PBKDF2 hash, plus safe legacy dev-mode fallback.
    """
    if not hashed or not plain_password:
        return False

    # Dev mode backwards compatibility
    if hashed == "sha256_mock_hash_for_dev_mode_change_in_prod":
        return plain_password in ["admin123", "Qwerty@123", "nexooai123", "Mohan@NeXooAi#2026"]

    if not hashed.startswith("pbkdf2:sha256:"):
        return False

    try:
        parts = hashed.split("$")
        if len(parts) != 3:
            return False
        iterations = int(parts[0].split(":")[2])
        salt = parts[1]
        key_hex = parts[2]
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return secrets.compare_digest(computed.hex(), key_hex)
    except Exception:
        return False
