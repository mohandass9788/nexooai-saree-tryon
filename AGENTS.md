# NeXooAi Agent Working Agreement

Before editing, read `docs/EXECUTION_MASTER_PLAN.md`, `docs/PROJECT_READINESS_AUDIT_2026-10-27.md`, and `docs/DOCUMENTATION_INDEX.md`.

## Non-negotiable rules

- Work only on the user-authorised phase/task; do not combine unrelated redesigns.
- Inspect and preserve existing uncommitted user changes.
- Reuse existing components, styles, services, schemas, models, and adapters. Prefer extraction/refactoring over copy-paste.
- Do not make `app.ts`, `app.html`, or `app.css` bigger for a new feature when it can be a standalone feature component/service/route.
- Do not add unauthenticated admin/data operations. Every sensitive backend route must have authorization and tenant scope.
- Do not expose secrets, send auth tokens in URL query parameters, or commit `.env` values.
- Do not call paid providers, delete data/files, or deploy without explicit authorisation.
- Add focused tests and run relevant build/test commands; report exact command results.
- Only mark a master-plan checkbox complete after proof exists. Update its Progress log on every verified handoff.

## Design and performance

- The kiosk flow is primary: fast, touch-first, Tamil/English, accessible, and resilient to camera/network/provider failures.
- Keep enhancements lazy-loaded and optional; they must not slow capture/result flow.
- Use shared design tokens/components and accessible toast/dialog UI. Do not introduce new browser `alert`/`confirm` usage.
- Keep API routes thin; put reusable business logic in service/repository/dependency layers.
