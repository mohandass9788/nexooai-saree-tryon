# System Architecture — NeXooAi Virtual Saree Try-On

## 1. Architecture Diagram

```
+-----------------------------------------------------------------+
|                       Customer Kiosk UI                         |
|           (Angular 18+ / TypeScript / Touch-First)             |
|   - Language Selector (Tamil / English)                         |
|   - Camera Capture & Consent Modal                              |
|   - Saree Catalogue & Filters                                   |
|   - Result Viewer & QR Code Generator                           |
+-------------------------------+---------------------------------+
                                | HTTP REST (/api/v1)
                                v
+-----------------------------------------------------------------+
|                      FastAPI Application                        |
|                                                                 |
|   [/api/v1/health]      [/api/v1/catalog]    [/api/v1/tryon]    |
|   Health & Telemetry    Saree CRUD/Query     Job Orchestration  |
|                                                                 |
|   +---------------------------------------------------------+   |
|   |                  Core Services Layer                    |   |
|   |  - ImageValidator (format, max 10MB, dimensions)        |   |
|   |  - TokenService (HMAC SHA-256 expiring QR download)     |   |
|   |  - RetentionService (auto-purges customer photos)       |   |
|   +---------------------------------------------------------+   |
|                                                                 |
|   +---------------------------------------------------------+   |
|   |               AI Try-On Adapter Interface               |   |
|   |                 (BaseTryOnEngine abstract)              |   |
|   |       |                           |                     |   |
|   |   +---+-------------------+   +---+-------------------+ |   |
|   |   | MockTryOnEngine       |   | CloudApiTryOnEngine   | |   |
|   |   | (Dev/Testing engine)  |   | (Fashn / Replicate)   | |   |
|   |   +-----------------------+   +-----------------------+ |   |
|   |                                                         |   |
|   |   +---------------------------------------------------+ |   |
|   |   | LocalAiTryOnEngine (Future - High VRAM GPU server)| |   |
|   |   +---------------------------------------------------+ |   |
|   +---------------------------------------------------------+   |
+-------------------------------+---------------------------------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
+------------------------+             +------------------------+
|   PostgreSQL / SQLite  |             | Private Object Storage |
|  - Products & Categories             |  - Saree Product Images|
|  - Try-On Sessions                   |  - Temporary Outputs   |
|  - Download Tokens                   |  - Expiring Signed URLs|
+------------------------+             +------------------------+
```

## 2. Component Breakdown

### Frontend (Kiosk)
- **Framework**: Angular 18+ standalone components, TypeScript.
- **State Management**: Reactive signals and services.
- **Hardware Integration**: HTML5 MediaDevices API (`navigator.mediaDevices.getUserMedia`) for live video feed and full-resolution frame capture.
- **Touch Design**: Minimum 48px touch targets, virtual keyboards for touchscreens, large interactive cards, high contrast display.

### Backend (FastAPI)
- **Framework**: FastAPI with asynchronous endpoints (`async/await`).
- **Data Validation**: Pydantic v2 schemas for all incoming payloads and responses.
- **Database Abstraction**: SQLAlchemy 2.0 with async engine and Alembic migrations.
- **Security**: Strict CORS headers, payload size limits (10MB max), and no secrets logged.

### Pluggable AI Adapter Pattern
The AI Virtual Try-On logic is isolated behind `BaseTryOnEngine`:
```python
class BaseTryOnEngine(ABC):
    @abstractmethod
    async def process_tryon(
        self, person_image_bytes: bytes, saree_image_bytes: bytes, options: dict
    ) -> TryOnResult:
        pass
```
This guarantees that switching from testing (Mock) to commercial API (Fashn.ai / Replicate / Fal) or to a custom in-house AI model requires changing only an environment variable (`AI_TRYON_PROVIDER`), with zero refactoring in API routes or frontend code.
