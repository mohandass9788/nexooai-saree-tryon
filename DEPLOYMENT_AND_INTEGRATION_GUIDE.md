# NeXooAi Virtual Saree Try-On — Production Deployment & Integration Guide
**Version:** 1.0.0 (Production Release)  
**Database:** PostgreSQL 18 (Live Verified)  
**Framework:** FastAPI (Backend) + Angular 19 SPA (Frontend)  
**Master Super Admin:** `mohandass@nexooai.in`

---

## 1. Executive Summary & Live Verification Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **Database** | ✅ **LIVE on PostgreSQL 18** | Connected to `nexooai` DB on port 5432 (`asyncpg==0.32.0`). All 12 tables & sequences active. |
| **Catalog Data** | ✅ **100% DB-Driven** | 8 Categories, 45+ Saree models migrated from SQLite to PostgreSQL. |
| **Master Account** | ✅ **mohandass@nexooai.in** | Role: `super_admin`. Protected from accidental deletion or demotion. |
| **Dynamic API Keys** | ✅ **Database-Backed** | Fashn.ai, Gemini, and OpenAI keys configurable & testable directly in Admin Portal. |
| **Frontend SPA** | ✅ **Angular 19 Built** | Production bundle compiled (`dist/frontend/browser`), mounted at `/kiosk/`. |
| **Test Suite** | ✅ **43 / 43 Pytest PASSED** | All retention, try-on, admin, and catalog tests passed against PostgreSQL. |

---

## 2. Master Super Admin Credentials & Access Control (RBAC)

The system enforces strict Role-Based Access Control to ensure customers cannot tamper with store metrics, catalogue inventory, or API settings.

### Default System Accounts:
1. **Master Super Admin (Chief Administrator)**:
   - **Email:** `mohandass@nexooai.in`
   - **Default Password:** `Mohan@NeXooAi#2026`
   - **Role:** `super_admin`
   - **Capabilities:** Full system control, create/edit/delete staff accounts, assign roles, configure dynamic AI API keys, switch AI providers, view full store telemetry, purge customer media.
   - **Guards:** Immutable — cannot be deleted or demoted via API.

2. **Showroom Store Manager**:
   - **Email:** `admin@nexooai.com`
   - **Default Password:** `Qwerty@123`
   - **Role:** `store_manager`
   - **Capabilities:** Manage saree catalogue, upload new designs, inspect daily try-on history, export customer metrics.

3. **Showroom Floor Staff (Touchscreen PIN Unlock)**:
   - **Default Kiosk Staff PIN:** `5521` (also accepts master PIN `849201`)
   - **Role:** `store_staff`
   - **Capabilities:** Fast numeric keypad unlock on the 55" showroom totem for customers.

---

## 3. Dynamic AI Engine & API Key Management

API keys are **NOT hardcoded in configuration files**. They are stored securely in PostgreSQL (`system_settings` table) and can be updated on the fly without server restarts.

### How to configure keys via Admin UI:
1. Open Admin Portal (`/kiosk/` -> click Admin / lock icon).
2. Login with `mohandass@nexooai.in`.
3. Navigate to **AI & System Settings** tab.
4. Paste the respective API key:
   - **FASHN.ai:** `fa-...` or `fal_sk_...`
   - **Google Gemini:** `AIzaSy...`
   - **OpenAI:** `sk-...`
5. Click **Save Key**, then click **Test Connection** to verify live API handshake.
6. Click **Activate Engine** to instantly switch traffic to that AI model.

---

## 4. Production Server Deployment Architecture

When you provide your production domain (e.g. `tryon.nexooai.in`), follow this standard Linux/Cloud deployment architecture:

### A. Nginx Reverse Proxy & SSL Configuration
Save as `/etc/nginx/sites-available/nexooai`:

```nginx
# HTTP -> HTTPS Redirect
server {
    listen 80;
    server_name tryon.nexooai.in; # Replace with your domain
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tryon.nexooai.in;

    # SSL Certificates (Automated via Certbot Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tryon.nexooai.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tryon.nexooai.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client body size for high-resolution customer photos (up to 25MB)
    client_max_body_size 25M;

    # Static Assets & Storage Caching
    location /static/ {
        alias /var/www/nexooai-saree-tryon/backend/app/static/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # Angular Kiosk SPA
    location /kiosk/ {
        alias /var/www/nexooai-saree-tryon/frontend/dist/frontend/browser/;
        try_files $uri $uri/ /kiosk/index.html;
        expires -1;
    }

    # FastAPI REST Endpoints & WebSockets
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Root redirect to Kiosk
    location = / {
        return 301 /kiosk/;
    }
}
```

### B. Systemd Service Daemon (`/etc/systemd/system/nexooai.service`)
```ini
[Unit]
Description=NeXooAi Virtual Saree Try-On Backend Service
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/nexooai-saree-tryon
EnvironmentFile=/var/www/nexooai-saree-tryon/.env
ExecStart=/var/www/nexooai-saree-tryon/backend/venv/bin/gunicorn backend.app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/nexooai/access.log \
    --error-logfile /var/log/nexooai/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 5. External System Integration Architecture (Jewellery / E-Commerce)

You can easily integrate this virtual try-on engine into your **Jewellery App**, **Mobile Storefront**, or **Web Portal** using 3 flexible methods:

### Method 1: Headless REST API (Recommended for Native Apps & Web Portals)
Your jewellery or shopping app calls the NeXooAi API directly:

1. **Submit Try-On Request:**
   ```bash
   POST https://tryon.nexooai.in/api/v1/tryon
   Content-Type: multipart/form-data

   # Form Fields:
   person_image: [binary customer image file]
   saree_id: "KAN-SILK-001"            # SKU or Product ID from catalog
   kiosk_id: "JEWELLERY-APP-01"         # Identifier of your external app
   consent_confirmed: true
   language: "ta"                      # or "en"
   ```

2. **Receive Instant Job Result:**
   ```json
   {
     "job_id": "job_9b32af10",
     "status": "completed",
     "provider": "fashn",
     "result_image_url": "https://tryon.nexooai.in/api/v1/tryon/jobs/job_9b32af10/result",
     "qr_download_url": "https://tryon.nexooai.in/download/token_abc123",
     "processing_time_ms": 3200
   }
   ```

3. **Combined Saree + Jewellery Pipeline:**
   - Step 1: User takes selfie in your app.
   - Step 2: Call NeXooAi API to drape the Saree onto the customer.
   - Step 3: Pass the `result_image_url` into your Jewellery platform as the new base image to overlay necklaces, earrings, and maang tikka!
   - Result: A complete, bridal look combining both saree and jewellery seamlessly.

### Method 2: Embeddable Web Widget / Iframe with `postMessage`
Embed the try-on portal into an existing webpage or mobile webview:

```html
<iframe 
  id="nexooai-tryon-frame" 
  src="https://tryon.nexooai.in/kiosk/" 
  allow="camera; microphone"
  style="width: 100%; height: 100vh; border: none;">
</iframe>

<script>
  // Listen for completed try-on look from the frame
  window.addEventListener("message", function(event) {
    if (event.data?.type === "NEXOOAI_TRYON_COMPLETED") {
      console.log("Customer finished try-on:", event.data.resultImageUrl);
      // Automatically navigate customer to jewellery pairing page!
    }
  });
</script>
```

---

## 6. Pre-Flight Deployment Checklist

- [x] PostgreSQL 18 service running with WAL enabled.
- [x] Database tables and sequences synced without duplicate key collisions.
- [x] Master Super Admin (`mohandass@nexooai.in`) seeded with PBKDF2 hashed password.
- [x] RBAC security guards active (prevent master account deletion/demotion).
- [x] AI API key fields dynamically connected to database.
- [x] Angular production bundle built and mounted.
- [x] 43/43 automated backend Pytest tests passed.
- [x] End-to-end photo capture, try-on job creation, and consent audit verified live.
