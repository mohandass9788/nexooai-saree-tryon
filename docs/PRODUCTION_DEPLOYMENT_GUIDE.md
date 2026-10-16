# NeXooAi Virtual Saree Try-On — Production Readiness & Deployment Guide
(வணிக ரீதியான உற்பத்தி மற்றும் நேரலை கையேடு)

---

## 1. ஆர்க்கிடெக்ச்சர் உறுதிப்படுத்தல் (100% API & Database Driven Architecture)

அனைத்து போலி தரவுகளும் (Mock Fallbacks) அகற்றப்பட்டு, முழு கணினியும் **FastAPI பேக்கெண்ட் API மற்றும் SQLite/DB தரவுத்தளத்துடன் 100% இணைக்கப்பட்டுள்ளது**:

| அம்சம் | பழைய நிலை (Old Behavior) | தற்போதைய நேரலை நிலை (Current Production) |
| :--- | :--- | :--- |
| **புடவை பட்டியல் (Catalogue)** | API தோல்வியடைந்தால் 4 போலி புடவைகள் தோன்றியது | `GET /api/v1/catalog` மூலம் தரவுத்தளத்தில் உள்ள **42+ நிஜப் புடவைகள்** மட்டுமே வருகின்றன. |
| **பிரிவுகள் (Categories)** | திரையில் 6 பட்டன்கள் மட்டுமே நிலைப்படுத்தப்பட்டிருந்தது | `GET /api/v1/catalog/categories/list` மூலம் DB-ல் உள்ள 8 வகைகளும் டைனமிக் முறையில் ஏற்றப்படுகின்றன. |
| **வாடிக்கையாளர் புகைப்படம்** | பிரவுசர் மெமரியில் மட்டுமே தற்காலிகமாக இருந்தது | `POST /api/v1/tryon` வழியாக பேக்கெண்ட்டிற்குச் சென்று `media/person_{job_id}.jpg` எனப் பதிவாகிறது. |
| **ட்ரை-ஆன் முடிவு படம்** | பிழை வந்தால் போலி 'completed' வெற்றுப் படம் உருவானது | `media/{job_id}.jpg` என சேமிக்கப்பட்டு, SQLite-ல் `tryon_jobs` அட்டவணையில் செலவு, நேரம், டோக்கனுடன் பதிவாகிறது. |
| **பிழை அறிவிப்புகள்** | தோல்விகள் மறைக்கப்பட்டு போலி அவுட்புட் காட்டியது | உண்மையான API பிழை அட்டை திரையில் தோன்றி **"மீண்டும் முயற்சி செய் (Retry)"** பொத்தான் வழங்கப்படுகிறது. |
| **நிர்வாகப் பலகை** | போலி எண்கள் (Mock metrics/jobs) காட்டப்பட்டன | SQLite `tryon_jobs` மற்றும் `products` அட்டவணையின் உண்மையான கணக்குகள் மட்டுமே காட்டப்படுகின்றன. |

---

## 2. தரவுத்தள ஒருமைப்பாடு (Database & Storage Verification)

### SQLite WAL Mode (Write-Ahead Logging)
- [session.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/db/session.py)-ல் தானியங்கி `PRAGMA journal_mode=WAL;` செயல்படுத்தப்பட்டுள்ளது.
- ஒரே நேரத்தில் பல கியோஸ்க்குகள் வாடிக்கையாளர் படங்களை பதிவேற்றினாலும் `database is locked` சிக்கல் எழாது.

### நேரடி சோதனை முடிவுகள் (Verified Live Metrics)
```
SUCCESS: Health -> 200 OK
SUCCESS: Categories -> 200 OK (8 Categories loaded from DB)
SUCCESS: Catalog -> 200 OK (42 Showroom Products from DB)
SUCCESS: Metrics -> 200 OK (Real DB Telemetry)
SUCCESS: Admin Products -> 200 OK (43 Products from DB)
SUCCESS: Media Storage -> 200 OK (media/person_*.jpg and media/*.jpg verified on disk)
SUCCESS: Production Angular SPA -> 200 OK (/kiosk/ compiled HTML5 bundle loaded)
```

---

## 3. புரொடக்ஷன் வெளியீடு வழிமுறைகள் (How to Run in Production)

### முறை 1: ஒற்றை ஒருங்கிணைந்த புரொடக்ஷன் துவக்கி (Unified Production Launcher - Recommended)

பிரண்ட்-எண்ட் பில்டு (`ng build`) ஏற்கனவே `frontend/dist/frontend/browser`-ல் உருவாக்கப்பட்டுள்ளது.
பேக்கெண்ட் இந்த கியோஸ்க் கோப்புகளை `/kiosk/` பாதையில் நேரடியாக வழங்குகிறது!

```powershell
cd "c:\Users\nithy\Videos\MNV's\nexooai-saree-tryon"
backend\venv\Scripts\python.exe backend\run_production.py
```

* **தொடுதிரை கியோஸ்க் URL**: `http://127.0.0.1:8000/kiosk/`
* **நிர்வாக போர்ட்டல்**: `http://127.0.0.1:8000/kiosk/` (மேல் வலதுபுறம் 🛡️ அழுத்தி PIN `849201` அல்லது `5521` தட்டச்சு செய்யவும்)
* **API ஆவணங்கள் (Swagger UI)**: `http://127.0.0.1:8000/docs`

---

### முறை 2: தனித்தனி டெவலப்மென்ட் முறையில் இயக்குதல் (Dev Multi-Terminal Mode)

* **டெர்மினல் 1 (FastAPI Backend)**:
  ```powershell
  cd "c:\Users\nithy\Videos\MNV's\nexooai-saree-tryon"
  backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
  ```

* **டெர்மினல் 2 (Angular Frontend)**:
  ```powershell
  cd "c:\Users\nithy\Videos\MNV's\nexooai-saree-tryon\frontend"
  npx ng serve --host 0.0.0.0 --port 4200
  ```

---

## 4. ஷோரூம் 55-இன்ச் டிவி கியோஸ்க் ஆட்டோ-ஸ்டார்ட் அமைப்பு (Kiosk Hardware Setup)

55-இன்ச் செங்குத்து டிஸ்பிளேயில் கணினி ஆன் ஆனதும் தானாகவே கியோஸ்க் திறக்க:

1. விண்டோஸ் `shell:startup` கோப்புறையில் குறுக்குவழி (Shortcut) உருவாக்கவும்.
2. Target கட்டளை:
   ```cmd
   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk http://127.0.0.1:8000/kiosk/ --edge-kiosk-type=fullscreen --no-first-run
   ```
3. இது முழுத் திரையில் எந்த பிரவுசர் பட்டிகளும் இன்றி அதிநவீன டிஜிட்டல் கண்ணாடி (Smart Mirror) அனுபவத்தைத் தரும்.

---

## 5. உற்பத்தி சூழல் மாறிகள் (.env Checklist for Production)

```env
# Production Config
APP_ENV=production
DEBUG=False
PORT=8000
HOST=0.0.0.0

# Security
SECRET_KEY=உங்கள்_வலுவான_ரகசிய_குறியீடு_64_எழுத்துக்கள்
MEDIA_RETENTION_HOURS=24
DOWNLOAD_TOKEN_EXPIRY_MINUTES=30

# Commercial AI Provider
AI_TRYON_PROVIDER=fashn
AI_TRYON_API_KEY=fa-உங்கள்_fashn_விசை_அல்லது_fal_key
```
