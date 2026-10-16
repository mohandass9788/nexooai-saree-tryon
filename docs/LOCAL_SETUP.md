# Local Setup Guide — NeXooAi Virtual Saree Try-On

## 1. Prerequisites
- **OS**: Windows 11 / Linux / macOS
- **Python**: Python 3.9 (recommended for dependency compatibility)
- **Node.js**: v20+ / v25+ with `npm`
- **Git**

---

## 2. Backend Setup (FastAPI)

1. Open PowerShell / Terminal in the project root:
   ```powershell
   cd "backend"
   ```

2. Create a virtual environment with Python 3.9:
   ```powershell
   py -3.9 -m venv venv
   ```

3. Activate the virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   *(If script execution is disabled, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

4. Install backend dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

5. Copy `.env.example` to `.env`:
   ```powershell
   cp ../.env.example .env
   ```

6. Run the FastAPI development server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

7. Open your browser and navigate to:
   - API Health Check: `http://localhost:8000/api/v1/health`
   - Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 3. Frontend Setup (Angular Kiosk)

1. Open a new terminal and navigate to `frontend/`:
   ```powershell
   cd "frontend"
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the Angular development server:
   ```powershell
   npm start
   ```

4. Access the Kiosk interface at: `http://localhost:4200`
