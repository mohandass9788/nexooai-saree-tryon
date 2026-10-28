# Testing Strategy — NeXooAi Virtual Saree Try-On

## 1. Backend Testing

The backend uses `pytest` with `httpx` (for FastAPI `AsyncClient` / `TestClient`).

### Running Backend Tests
From the `backend/` directory, run against the isolated test database:
```powershell
$env:APP_ENV="testing"
$env:DATABASE_URL="sqlite+aiosqlite:///./test.db"
$env:STORAGE_LOCAL_DIR="./test-media"
$env:AI_TRYON_PROVIDER="mock"
$env:PYTHONPATH=".."
.\venv\Scripts\python.exe -m pytest -v
```

The suite rejects non-test databases and removes its test database/media artifacts after it finishes.

### Test Coverage Areas
1. **Health & Telemetry**: Validates `GET /api/v1/health` status and system info.
2. **Catalogue Endpoints**: Validates `GET /api/v1/catalog`, filtering, search, and pagination.
3. **AI Adapter Unit Tests**:
   - Validates `MockTryOnEngine` executes and produces simulated output.
   - Validates error handling for missing/corrupted image payloads.
   - Validates consent enforcement (rejects requests where `consent_confirmed` is `false`).
4. **Image Preprocessing**: Validates format checking (JPEG/PNG/WEBP) and file size ceiling (10 MB).

---

## 2. Frontend Testing (Planned for Milestone 2)
- Unit tests with Jasmine/Karma or Vitest.
- Mocking backend API responses.
- Kiosk state machine testing (Welcome -> Consent -> Camera -> Catalogue -> Processing -> Result -> Timeout).
