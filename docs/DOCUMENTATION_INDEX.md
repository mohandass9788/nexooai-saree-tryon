# Documentation Index — Canonical vs Legacy

இந்த file-ன் நோக்கம் duplicate/old documentation-ஆல் agent குழப்பம் வராமல் தடுப்பது. **Delete செய்வதற்கு முன் இந்த classification-ஐப் பயன்படுத்தவும்.**

## முதலில் படிக்க வேண்டிய canonical files

1. [EXECUTION_MASTER_PLAN.md](EXECUTION_MASTER_PLAN.md) — phases, checklists, guardrails, handoff prompt.
2. [SAAS_ACCESS_AND_SUBSCRIPTION_PLAN.md](SAAS_ACCESS_AND_SUBSCRIPTION_PLAN.md) — current five-phase B2B login, tenant, subscription and kiosk plan; takes priority over Phase 6/7 work.
3. [PROJECT_READINESS_AUDIT_2026-10-27.md](PROJECT_READINESS_AUDIT_2026-10-27.md) — evidence-based current audit and blockers.
4. [README.md](../README.md) — public project introduction and local entry points; details may need updating against the master plan.
5. [AGENTS.md](../AGENTS.md) — implementation rules for future coding agents.

## Reference documentation — retain

- `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/API_DOCUMENTATION.md`, `docs/AI_INTEGRATION.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/LOCAL_SETUP.md`, `docs/TESTING.md`
- `docs/SHOWROOM_ADMIN_AND_AI_DRAPE_ARCHITECTURE.md`
- `DEPLOYMENT_AND_INTEGRATION_GUIDE.md`, `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

These are useful technical references, but the master plan wins if their status claims conflict.

## Historical / stale-candidate files — do not use as current truth

- `PROJECT_STATUS_AUDIT.md`
- `docs/CURRENT_STATUS_AND_NEXT_STEPS.md`
- `SESSION_HANDOVER_RESUME.md`
- `docs/FAL_AI_INTEGRATION_STATUS.md`
- `PROJECT_CHANGELOG_AND_FIXES.md`
- `CLAUDE_CODE_HANDOVER_AND_MASTER_DOCS.md`

These may contain useful history, but include time-specific claims and older plans. Archive or replace only after their necessary information has been merged into canonical files and the user explicitly approves deletion.

## Documentation housekeeping rule

No new status/plan/handover markdown file should be created if the information fits `EXECUTION_MASTER_PLAN.md` or the readiness audit. Add a dated entry to the master plan Progress log instead.
