# Security & Privacy Policy — NeXooAi Virtual Saree Try-On

## 1. Customer Photo Privacy & Retention
- **Explicit Consent**: The kiosk requires the customer to tap "I Agree" on the photo consent screen before enabling camera snapshot and upload.
- **No Training On Customer Photos**: Customer images are strictly processed for temporary try-on generation and are **never** used to train AI models.
- **Automated Retention & Deletion**:
  - Customer input photos and generated try-on previews have an expiry timestamp (default 24 hours).
  - A scheduled cleanup task purges all files past their retention window.
- **Session Auto-Reset**: Inactivity of 90 seconds triggers an automatic kiosk reset, clearing the local browser session state and camera feed.

---

## 2. Media Access Control & QR Downloads
- **Short-Lived Download Tokens**:
  - Download links shared via QR code use cryptographically secure tokens with an expiration window (default 30 minutes).
  - Storage bucket keys are never exposed directly to the public client.
  - Rate limiting is enforced on download endpoints to prevent link scraping.

---

## 3. Application & Secret Security
- **No Hardcoded Secrets**: Secrets, database passwords, and third-party AI keys are loaded exclusively from `.env` files or environment variables.
- **Git Hygiene**: `.gitignore` strictly blocks all `.env`, `.pem`, credentials, and local media caches.
- **Input Sanitization**: File uploads are verified by inspecting magic bytes (MIME type verification) to prevent malicious script execution.
- **CORS Configuration**: Restrict allowed origins to designated kiosk domains and local development ports.
