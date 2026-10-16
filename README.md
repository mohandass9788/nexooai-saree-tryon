# NeXooAi Virtual Saree Try-On
> **AI-Powered Virtual Saree Trial Platform for Indian Textile Retail Stores**

NeXooAi Virtual Saree Try-On is an enterprise-grade retail platform that enables saree showroom customers to preview how a saree looks draped on them via a touchscreen kiosk.

> **Notice**: The generated image is a visual styling preview, not an absolute guarantee of physical fitting or exact fabric appearance.

---

## 📌 Features & Workflow
- **Touch-Friendly Kiosk**: Built for touchscreens with responsive touch controls, high contrast, and virtual keyboard input.
- **Bilingual Interface**: Native **Tamil (`தமிழ்`)** and **English (`EN`)** support.
- **Camera Capture & Privacy**: Live webcam preview, photo snapshot, and clear explicit consent agreement.
- **Saree Catalogue**: Instant filtering by fabric (Kanchipuram Silk, Banarasi, Cotton, Chiffon), color, and price.
- **Pluggable AI Try-On**: Provider-agnostic adapter supporting hosted AI Try-On APIs with seamless fallback to custom local/cloud models.
- **Instant Mobile QR Download**: Customers can scan an on-screen QR code with their smartphone to securely download their try-on photo using an expiring token.
- **Privacy & Auto-Purge**: Automatic retention enforcement and customer session timeout (90 seconds).

---

## 🏗️ System Architecture
```text
[ Kiosk Frontend (Angular) ]  <--- HTTP REST --->  [ FastAPI Backend (Python 3.9) ]
                                                           │
                                             ┌─────────────┴─────────────┐
                                             ▼                           ▼
                                    [ SQLite / PostgreSQL ]      [ Pluggable AI Adapter ]
                                                                  ├── Mock Engine (Dev)
                                                                  ├── Cloud API (Fashn/Replicate)
                                                                  └── Custom GPU Server
```

---

## 📚 Documentation Index
Comprehensive technical documentation is maintained in the [`docs/`](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/) folder:
- [docs/PROJECT_OVERVIEW.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/PROJECT_OVERVIEW.md) — Product vision, kiosk flow, and roadmap.
- [docs/ARCHITECTURE.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/ARCHITECTURE.md) — System components and data flow.
- [docs/DATABASE_DESIGN.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/DATABASE_DESIGN.md) — Entity-relationship diagrams and table schemas.
- [docs/API_DOCUMENTATION.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/API_DOCUMENTATION.md) — REST API endpoints specification (`/api/v1`).
- [docs/AI_INTEGRATION.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/AI_INTEGRATION.md) — AI adapter pattern, provider mapping, and image limits.
- [docs/SECURITY.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/SECURITY.md) — Customer privacy, consent rules, and data retention.
- [docs/LOCAL_SETUP.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/LOCAL_SETUP.md) — Step-by-step developer installation guide.
- [docs/TESTING.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/TESTING.md) — Test setup and execution guide.
- [docs/DEPLOYMENT.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/DEPLOYMENT.md) — Production Docker and Nginx deployment guidelines.
- [docs/DECISIONS.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/DECISIONS.md) — Architecture Decision Records (ADRs).

---

## 🚀 Quick Start (Local Development)

### 1. Backend (FastAPI + Python 3.9)
```powershell
cd backend
py -3.9 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000
```
- Health Check: `http://localhost:8000/api/v1/health`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### 2. Frontend Kiosk (Angular + TypeScript)
```powershell
cd frontend
npm install
npm start
```
- Kiosk App: `http://localhost:4200`

---

## 🛡️ License
Private & Proprietary — NeXooAi Saree Try-On Team.
