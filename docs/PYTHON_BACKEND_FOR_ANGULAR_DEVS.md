# Angular டெவலப்பர்களுக்கான Python & FastAPI வழிகாட்டி (A Complete Guide for Angular Developers)

> **நோக்கம்:** நீங்கள் Angular மற்றும் TypeScript-ல் அனுபவம் வாய்ந்தவர், ஆனால் Python-க்கு புதியவர். இந்த ஆவணம் நம் NeXooAi திட்டத்தில் உள்ள Python பேக்கெண்ட்டை உங்கள் Angular அறிவோடு நேரடியாக ஒப்பிட்டு (Concept-by-Concept Comparison), நீங்கள் மிக எளிதாகப் புரிந்துகொள்ளும் வகையில் வடிவமைக்கப்பட்டுள்ளது.

---

## 1. அடிப்படை தொழில்நுட்ப ஒப்பீடு (Core Ecosystem Comparison)

நீங்கள் Angular-ல் செய்யும் ஒரு செயலை Python-ல் எப்படிச் செய்கிறோம் என்பதற்கான விரைவு அட்டவணை:

| அம்சம் | Angular (Frontend) | Python / FastAPI (Backend) | விளக்கம் |
| :--- | :--- | :--- | :--- |
| **மொழி (Language)** | TypeScript (`.ts`) | Python 3.9+ (`.py`) | இரண்டும் Strict Type Checking ஆதரிக்கும். |
| **பேக்கேஜ் மேனேஜர்** | `npm` | `pip` | லைப்ரரிகளை இன்ஸ்டால் செய்யப் பயன்படுகிறது. |
| **தொகுப்புகள் கோப்பு** | `package.json` | `requirements.txt` | திட்டத்தின் டிபென்டென்சிகளைப் பட்டியலிடுகிறது. |
| **நிறுவப்படும் இடம்** | `node_modules/` | `venv/` (Virtual Environment) | தனிமைப்படுத்தப்பட்ட லைப்ரரி ஃபோல்டர். |
| **டெவலப்மென்ட் சர்வர்** | `ng serve` (Webpack/Vite) | `uvicorn main:app --reload` | லைவ்-ரீலோட் உடன் சர்வரை இயக்கும் டூல். |
| **நுழைவுப் புள்ளி** | `main.ts` | `main.py` | அப்ளிகேஷன் தொடங்கும் முதல் கோப்பு. |
| **ரூட்டிங் (Routing)** | `app.routes.ts` | `APIRouter` (`endpoints/`) | URL பாதைகளை (Paths) மேப் செய்யும் இடம். |
| **டிபென்டென்சி இன்ஜெக்ஷன்**| `@Injectable({providedIn})` | `Depends(...)` / Factory Method | சர்வீஸ்களை மற்ற கோப்புகளில் இணைக்க. |
| **அமைப்பு மாறிகள்** | `environment.ts` | `.env` & `settings` (Pydantic) | API Key, Port, Provider போன்ற ரகசியங்கள். |

---

## 2. குறியீட்டு ஒப்பீடு: TypeScript vs Python (Code-by-Code)

### அ) டேட்டா மாடல்கள் (Interfaces vs Pydantic Models)

Angular-ல் நாம் API டேட்டாவுக்கு `interface` அல்லது `type` எழுதுவோம். Python-ல் **Pydantic `BaseModel`** எழுதுவோம்:

```typescript
// Angular (TypeScript) - interface
export interface PoseValidationResult {
  is_valid: boolean;
  pose_score: number;
  guidance_message_ta: string;
  green_tick: boolean;
}
```

```python
# Python (FastAPI) - Pydantic BaseModel (backend/app/services/tryon/gemini_guard.py)
from pydantic import BaseModel

class PoseValidationResult(BaseModel):
    is_valid: bool
    pose_score: float
    guidance_message_ta: str
    green_tick: bool
```
> **சிறப்பு:** Angular இன்டர்பேஸ் ரன்டைமில் அழியும் (Compile time only). ஆனால் Python-ல் Pydantic மாடல் தவறான டேட்டா வந்தால் தானாகவே `422 Unprocessable Entity` பிழையை தடுத்து நிறுத்தும் (Runtime Validation)!

---

### ஆ) ஏபிஐ அழைப்புகள் (HttpClient / RxJS vs httpx / async-await)

Angular-ல் நாம் `HttpClient.post()` மற்றும் `Observable` பயன்படுத்துவோம். Python-ல் **`httpx.AsyncClient()`** மற்றும் `async/await` பயன்படுத்துவோம்:

```typescript
// Angular (TypeScript) - HttpClient
this.http.post<TryOnResponse>('/api/v1/tryon', formData).subscribe({
  next: (res) => console.log(res),
  error: (err) => console.error(err)
});
```

```python
# Python (FastAPI) - httpx async/await
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.post(api_url, json=payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
```

---

### இ) ரூட்டிங் மற்றும் கண்ட்ரோலர் (Component Handler vs FastAPI Endpoint)

```typescript
// Angular Component Method
onSelectSaree(sareeId: string): void {
  // logic
}
```

```python
# FastAPI Route Handler (backend/app/api/v1/endpoints/tryon.py)
@router.post("", response_model=TryOnJobResponse)
async def create_tryon_job(
    person_image: UploadFile = File(...),
    saree_id: str = Form(...),
    consent_confirmed: bool = Form(...),
):
    # logic
    return result
```

---

## 3. நமது NeXooAi பேக்கெண்ட் கோப்புகளின் வரைபடம் (Architecture Tour)

நமது திட்டத்தில் [backend/app/](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app) கோப்புறையில் உள்ள ஒவ்வொரு கோப்பும் என்ன செய்கிறது என்ற நேரடி விளக்கம்:

### 1. [main.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/main.py) (The Application Bootstrapper)
* **Angular-ல் இதற்கு சமம்:** `main.ts` + `app.config.ts`.
* **வேலை:** FastAPI செயலியை உருவாக்குகிறது, CORS பாலிசி அமைக்கிறது, ஸ்டேடிக் புகைப்படங்களை (`/static`) ஹோஸ்ட் செய்கிறது, மற்றும் API ரூட்டர்களை (`/api/v1`) இணைக்கிறது.

### 2. [core/config.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/core/config.py) (Settings & Environment)
* **Angular-ல் இதற்கு சமம்:** `src/environments/environment.ts`.
* **வேலை:** `.env` கோப்பில் உள்ள `HF_TOKEN`, `GEMINI_API_KEY`, `DATABASE_URL` போன்ற அமைப்புகளை பாதுகாப்பாக எடுத்து முழு பேக்கெண்டுக்கும் தருகிறது.

### 3. [api/v1/endpoints/tryon.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/tryon.py) (Try-On Controller)
* **வேலை:** 
  1. `POST /api/v1/tryon/validate-pose`: வாடிக்கையாளர் படத்தை Gemini-க்கு அனுப்பி போஸ் தரத்தை சோதிக்கிறது.
  2. `POST /api/v1/tryon`: வாடிக்கையாளர் படம் மற்றும் புடவையை எடுத்துக்கொண்டு AI என்ஜினுக்கு அனுப்புகிறது.
  3. `GET /api/v1/tryon/jobs/{id}/result`: உருவாக்கப்பட்ட ட்ரை-ஆன் முடிவை பிரவுசருக்கு அனுப்புகிறது.

### 4. [api/v1/endpoints/catalog.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/catalog.py) (Garment Catalog Controller)
* **வேலை:** 9 பிரீமியம் ஆடைகள் (காஞ்சிபுரம் பட்டு, காட்டன் சட்டை, வேட்டி, சூட்) அடங்கிய அட்டவணையை Angular திரைக்கு அனுப்புகிறது.

### 5. [services/image/bg_remover.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/image/bg_remover.py) (AI Background Removal)
* **வேலை:** நாம் இன்று நிறுவிய `rembg` (U2Net AI) மூலமாக, வாடிக்கையாளர் எடுத்த புகைப்படத்தின் பின்னணியை (வீடு, கடைகள், மரங்கள்) நீக்கி, சொகுசு ஷோரூம் வெள்ளை பின்னணியாக மாற்றுகிறது.

### 6. [services/tryon/gemini_guard.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/gemini_guard.py) (Pose & Lighting Quality AI)
* **வேலை:** `Gemini 3.5 Flash-Lite` விஷன் மாடலைப் பயன்படுத்தி, வாடிக்கையாளர் கேமராவை நேராகப் பார்க்கிறாரா, வெளிச்சம் போதுமா என்று சரிபார்த்து தமிழில் வழிகாட்டுகிறது.

### 7. [services/tryon/hf_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/hf_engine.py) (Zero-Cost Try-On Engine)
* **வேலை:** `gradio_client` மூலமாக Hugging Face IDM-VTON ஸ்பேஸை அழைத்து, $0 செலவில் ஆடை மாற்றத்தை உருவாக்குகிறது.

### 8. [services/tryon/cloud_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/cloud_engine.py) (Commercial Cloud VTON Engine)
* **வேலை:** `FASHN.ai` மற்றும் `Replicate` போன்ற வணிகத்தர AI API-களுடன் இணைக்கும் அடாப்டர்.

### 9. [services/tryon/factory.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/factory.py) (The Engine Factory)
* **Angular-ல் இதற்கு சமம்:** Dependency Injection Provider Factory.
* **வேலை:** `.env`-ல் என்ன பெயர் இருக்கிறதோ (`huggingface` அல்லது `fashn` அல்லது `mock`), அதற்கேற்ற சர்வீஸைத் தானாகவே தேர்ந்தெடுத்து வழங்குகிறது. இதனால் பிரண்ட்-எண்டிலோ அல்லது ரூட்டுகளிலோ எந்தக் குறியீட்டையும் மாற்ற வேண்டிய அவசியமில்லை!

---

## 4. சுருக்கம் & நீங்கள் தெரிந்துகொள்ள வேண்டிய முக்கியமான குறிப்புகள்

1. **Python-ல் செமிகோலன் (`;`) கிடையாது:** 
   * குறியீட்டின் வரிகளைப் பிரிக்க Indentation (4 Spaces தள்ளி வைப்பது) மிக முக்கியம்.
2. **`None` என்பது TypeScript-ன் `null` அல்லது `undefined`:**
   * Python-ல் வேல்யூ இல்லை என்றால் `None` என்று எழுதுவோம்.
3. **`True` மற்றும் `False` முதல் எழுத்து Capital:**
   * TypeScript-ல் `true`, `false`. Python-ல் `True`, `False`.
4. **டிக்ஷனரி (`dict`) என்பது JSON Object:**
   * TypeScript-ல் `{ name: 'Saree', price: 100 }`.
   * Python-ல் `{"name": "Saree", "price": 100}` (Keys கட்டாயம் Quotes-க்குள் இருக்க வேண்டும்).
