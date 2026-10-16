# Architecture Decision Records (ADR) — NeXooAi Virtual Saree Try-On

## ADR 001: Cloud AI Try-On Adapter vs. Local GPU Inference
- **Date**: 2026-10-11
- **Status**: Accepted
- **Context**: The local development machine possesses an NVIDIA GeForce GTX 1650 with 4 GB VRAM. Modern VTON diffusion models (IDM-VTON, CatVTON, OOTDiffusion) demand 8 GB to 16 GB+ VRAM.
- **Decision**: Decouple the AI Try-On service behind a provider-agnostic adapter (`BaseTryOnEngine`). Implement a mock engine for development, an external hosted API for production trials, and reserve custom model hosting for future dedicated GPU infrastructure.
- **Consequence**: Zero local GPU memory bottlenecks, rapid development cycle, and cost-efficient scaling.

---

## ADR 002: Dual Database Strategy (SQLite Dev / PostgreSQL Production)
- **Date**: 2026-10-11
- **Status**: Accepted
- **Context**: The laptop has ~5.16 GB of free disk space. Installing Docker Desktop + WSL2 images would consume all available disk space.
- **Decision**: Use async SQLite (`aiosqlite` via SQLAlchemy) for lightweight local development, while maintaining standard SQL/Alembic schemas fully compatible with PostgreSQL in production.
- **Consequence**: Preserves machine disk space, avoids system crashes, and provides instant zero-setup local execution.

---

## ADR 003: Touchscreen Kiosk Language Support (Tamil & English)
- **Date**: 2026-10-11
- **Status**: Accepted
- **Context**: The primary target market is Indian textile showrooms, particularly in Tamil Nadu.
- **Decision**: Build the kiosk interface with native bilingual support (Tamil `தமிழ்` and English `EN`), with i18n architecture ready for Telugu, Hindi, and Kannada.
- **Consequence**: Enhanced accessibility for local store shoppers with high customer satisfaction.
