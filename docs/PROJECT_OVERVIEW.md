# Project Overview — NeXooAi Virtual Saree Try-On

## 1. Vision & Purpose
**NeXooAi Virtual Saree Try-On** is a commercial AI platform tailored for Indian textile and saree retail shops. It provides an intuitive, touch-screen kiosk experience that enables shoppers to virtually drape and preview sarees without having to manually wear each piece.

> **Visual Preview Notice**: The generated try-on image is an AI-assisted visual preview and styling guide, not an absolute guarantee of physical fitting, drape physics, or exact fabric texture.

---

## 2. Customer Kiosk Workflow
1. **Welcome & Language Selection**: Customer selects Tamil (`தமிழ்`) or English (`EN`).
2. **Consent Agreement**: Clear, explicit photo consent notice outlining that the captured photo is used strictly for generating the try-on preview and automatically deleted.
3. **Camera Capture**: Live preview using the kiosk webcam/camera, snapshot trigger, and option to retake.
4. **Catalogue Browsing**: Shopper filters sarees by category (Kanchipuram Silk, Banarasi, Cotton, Chiffon, etc.), color, and price.
5. **AI Try-On Processing**: The system submits the customer photo and saree image to the AI Try-On service, displaying an engaging live progress state.
6. **Result & QR Download**: The generated saree drape is displayed side-by-side with the original photo. A secure, short-lived QR code allows immediate mobile download.
7. **Session Timeout & Auto-Reset**: Inactivity timeout (default 90 seconds) resets the kiosk to the welcome screen and cleans up temporary session data.

---

## 3. High-Level Architecture Overview
- **Frontend (Kiosk & Admin)**: Angular + TypeScript touch-first kiosk UI with responsive touch targets and bilingual support.
- **Backend API**: Python 3.9+ with FastAPI providing versioned REST endpoints (`/api/v1/`).
- **Database**: PostgreSQL (with SQLite support for lightweight local development).
- **AI Virtual Try-On Engine**: Hosted API integration initially (via a decoupled adapter pattern), with future extensibility for custom/local inference models.
- **Storage**: Private local directory or S3-compatible bucket (e.g. MinIO/AWS S3) with expiring access tokens.

---

## 4. Current Implementation Status
| Module | Planned | Status |
| :--- | :--- | :--- |
| Project Structure & Configuration | Milestone 1 | Completed |
| Architecture & Master Documentation | Milestone 1 | Completed |
| Backend Core Skeleton & Health Check | Milestone 1 | Completed |
| Abstract Try-On Adapter (Mock Engine) | Milestone 1 | Completed |
| Saree Catalogue API (`/api/v1/catalog`) | Milestone 1 | Completed |
| Customer Kiosk Touchscreen UI (Angular) | Milestone 2 | Completed |
| Real AI API Integration (Fashn/Replicate/Fal) | Milestone 3 | Completed |
| Secure QR Download & Expiration Tokens | Milestone 3 | Completed |
| Admin Dashboard (Products & Kiosks) | Milestone 4 | Completed |
| Docker & Production Deployment | Milestone 5 | Planned |
