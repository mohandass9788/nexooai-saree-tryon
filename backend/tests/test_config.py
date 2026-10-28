import pytest
from pydantic import ValidationError

from backend.app.core.config import Settings


def test_debug_accepts_release_alias_as_false():
    assert Settings(DEBUG="release", _env_file=None).DEBUG is False
    assert Settings(DEBUG="production", _env_file=None).DEBUG is False


def test_debug_rejects_unknown_values():
    with pytest.raises(ValidationError):
        Settings(DEBUG="not-a-boolean", _env_file=None)


def test_public_base_url_is_configurable():
    settings = Settings(PUBLIC_BASE_URL="https://tryon.example.in/", _env_file=None)
    assert settings.PUBLIC_BASE_URL == "https://tryon.example.in/"
