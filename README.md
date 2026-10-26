# NeXooAi Virtual Saree Try-On & B2B SaaS Retail Platform

> **AI-Powered Virtual Saree Trial Mirror & Multi-Tenant Retail Platform for Indian Textile Showrooms**  
> **Release Version:** 2.0.0 (Production Release)  
> **Test Status:** ✅ 43 / 43 Pytest Unit Tests Passing (100% Green) | ✅ Angular 19 Production Build Clean | ✅ CI/CD Automated  

---

## 📖 Primary Documentation & AI Agent Handover

- 🚀 **[CLAUDE_CODE_HANDOVER_AND_MASTER_DOCS.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/CLAUDE_CODE_HANDOVER_AND_MASTER_DOCS.md)** — **Master specification for developers and external AI coding agents (Claude Code, Cursor, Copilot).** Contains full directory tree, architectural rules, code invariants, and guidance.
- 📋 **[PROJECT_CHANGELOG_AND_FIXES.md](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/PROJECT_CHANGELOG_AND_FIXES.md)** — Exhaustive log of all 6 core bugs diagnosed and resolved across TypeScript, FastAPI, PostgreSQL asyncpg, and Pytest.
- 📚 **[`docs/`](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/docs/)** — Detailed engineering specifications covering API routes, architecture, security, and database design.

---

## 🌟 Key Platform Features

1. **Touch-Friendly 9:16 Portrait Mirror Kiosk:**
   - Designed for 55" showroom totems with live webcam preview, pose guidance, and instant AI drape generation.
2. **Wedding Lighting Simulation (4 Ambiences):**
   - Mandapam Golden Glow (2800K), Evening Reception (4500K), Temple Golden Hour, and Showroom Studio (5500K).
3. **Cultural Saree Drape Physics (3 Styles):**
   - Traditional Nivi Drape, Gujarati Front Seedha Pallu, and Royal Coorgi Pleats.
4. **Bridal Heritage Jewellery Suite & Groom Attire Twinning:**
   - Kasu Malai (Coin Necklace), Polki Diamond Choker, Temple Gold Choker, and Heritage Ruby Haram.
   - Matching groom silk dhoti and royal kurta twinning preview.
5. **Floor Sales Desk POS Counter Slip Generator:**
   - Generates thermal slips (`TK-482910`) with saree SKU, exact floor rack locator (e.g. `Rack-A3`), price, and barcode.
6. **Family WhatsApp Voting & Live Approval Polls:**
   - Relatives at home can vote on try-on looks in real-time via `/kiosk/family-poll/{poll_code}`.
7. **B2B Multi-Tenant SaaS Platform & Catalog Ingestion API:**
   - Multi-tier subscriptions: Silver (₹12,999/mo), Gold (₹24,999/mo), Platinum (₹49,999/mo).
   - Super Admin dashboard tracking MRR (₹), active stores, and token usage meters.
   - Programmatic Catalog Ingestion: `POST /api/v1/tenant/catalog/sync` and `POST /api/v1/tenant/catalog/import-url`.

---

## 🔐 Default Credentials Quick Reference

| Role | Email / Identifier | Password / PIN | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `mohandass@nexooai.in` | `mohandass@1992` | Full platform control, all boutiques, MRR tracking, onboarding |
| **Store Manager** | `admin@nexooai.com` | `Qwerty@123` | Single boutique inventory, products, staff PIN, kiosk locks |
| **Kiosk Staff PIN** | Showroom Keypad | `2468` | Unlock kiosk, camera controls, POS slip printing |
| **Kiosk Admin PIN** | Showroom Keypad | `1357` | Switch kiosk mode, update store branding |
| **Default Tenant API Key** | Shop `shop_default` | `sk_live_nexooai_default_01` | Programmatic catalog ingestion |

---

## 🏗️ System Architecture

```text
[ Kiosk Frontend (Angular 19) ]  <--- HTTP REST --->  [ FastAPI Backend (Python 3.10) ]
                                                            │
                                              ┌─────────────┴─────────────┐
                                              ▼                           ▼
                                    [ SQLite / PostgreSQL ]      [ Pluggable AI Adapter ]
                                                                  ├── Fashn.ai Cloud API
                                                                  ├── Kolors / Replicate
                                                                  ├── Google Gemini AI
                                                                  └── Mock Fallback Engine
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend (FastAPI + Python)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m backend.app.db.init_db
$env:PYTHONPATH="."
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

### 2. Frontend (Angular 19)
```powershell
cd frontend
npm install
npm start
```
- Kiosk Mirror & Admin Portal: `http://localhost:4200`

---

## 🧪 Testing

```powershell
# Run backend tests (43/43 passing)
cd backend
$env:PYTHONPATH=".."
.\venv\Scripts\pytest -v

# Validate frontend production bundle
cd ../frontend
npm run build
```

---

## 🐳 Production Deployment (Docker Compose)

```bash
# 1. Clone repository
git clone https://github.com/mohandass9788/nexooai-saree-tryon.git
cd nexooai-saree-tryon

# 2. Build and start containers
docker-compose up -d --build

# 3. Seed database
docker-compose exec backend python -m backend.app.db.init_db
```

Application is served at:
- Frontend Web App: `http://<server-ip>:80`
- Backend API Docs: `http://<server-ip>:8000/docs`

---

## 🛡️ License
Private & Proprietary — NeXooAi Saree Try-On Team.
