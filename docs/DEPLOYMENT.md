# Deployment Guide — NeXooAi Virtual Saree Try-On

## 1. Production Architecture Overview
- **Frontend Kiosk**: Compiled Angular static SPA served via Nginx with caching headers.
- **Backend API**: FastAPI application served by Uvicorn workers behind an Nginx reverse proxy with SSL termination.
- **Database**: Managed PostgreSQL instance (e.g. AWS RDS / Supabase / DigitalOcean Managed DB).
- **Object Storage**: S3-compatible storage (AWS S3 or MinIO) with private bucket policies.
- **AI Virtual Try-On**: Secure HTTPS connection to hosted API provider with API key rotation.

---

## 2. Docker Setup (Planned for Milestone 5)
```text
docker-compose.yml
├── nginx (Port 80/443, SSL, reverse proxy to kiosk & API)
├── backend (FastAPI application container)
├── postgres (Relational database)
└── minio (S3-compatible local/self-hosted object storage, optional)
```

## 3. Environment Checklist for Production
- [ ] `DEBUG=false`
- [ ] `APP_ENV=production`
- [ ] Strong `SECRET_KEY` generated
- [ ] `CORS_ORIGINS` limited to kiosk and admin hostnames
- [ ] HTTPS enforced with valid TLS certificate
- [ ] AI provider rate limits and cost alert webhooks configured
