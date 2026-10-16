# API Documentation — NeXooAi Virtual Saree Try-On

All endpoints are versioned under `/api/v1`.

## 1. System & Health

### `GET /api/v1/health`
Check application health, database connectivity, and active AI adapter status.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development",
  "ai_provider": "mock",
  "database": "connected"
}
```

---

## 2. Saree Catalogue

### `GET /api/v1/catalog`
Query sarees for the kiosk display.

**Query Parameters**:
- `category` (optional, string): Filter by category slug (e.g., `kanchipuram-silk`).
- `fabric` (optional, string): Filter by fabric.
- `search` (optional, string): Search query against SKU or name.
- `page` (int, default 1): Page number.
- `limit` (int, default 20): Items per page.

**Response `200 OK`**:
```json
{
  "items": [
    {
      "id": "prod_01",
      "sku": "KAN-SILK-001",
      "name": "Kanchipuram Pure Silk Bridal Saree",
      "category": "Silk Sarees",
      "color": "Royal Crimson Red",
      "fabric": "Mulberry Silk",
      "price": 14999.00,
      "primary_image_url": "/static/sarees/kan-silk-001.jpg",
      "is_active": true
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

---

## 3. AI Try-On Operations

### `POST /api/v1/tryon`
Submit a person photo and a saree image for virtual try-on processing.

**Request (`multipart/form-data`)**:
- `person_image`: Image file (JPEG/PNG/WEBP, max 10MB).
- `saree_id`: String (SKU or product ID).
- `consent_confirmed`: Boolean (must be `true`).
- `language`: String (`ta` or `en`).

**Response `200 OK` (Synchronous or Job initiated)**:
```json
{
  "job_id": "job_9b1deb4d",
  "status": "completed",
  "result_image_url": "/api/v1/tryon/jobs/job_9b1deb4d/result",
  "download_token": "tok_sec_8f93a1...",
  "qr_download_url": "/api/v1/tryon/download/tok_sec_8f93a1...",
  "processing_time_ms": 350,
  "provider": "mock"
}
```

### `GET /api/v1/tryon/jobs/{job_id}`
Poll try-on job status (for asynchronous processing).

**Response `200 OK`**:
```json
{
  "job_id": "job_9b1deb4d",
  "status": "processing",
  "progress_percentage": 65,
  "created_at": "2026-10-11T19:50:00Z"
}
```
