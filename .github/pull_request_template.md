# PR Template — StudyFlow

## What changed
- 

## How to test locally
- Commands/steps:
  - `pnpm run backend:lint` (expect: green)
  - `pnpm run backend:test` (expect: green)
  - Optional smoke via Swagger `/docs` or curl (list specific endpoints and expected statuses: 201/200/400/409)

## Links
- Swagger: http://localhost:4000/docs
- Related docs: `docs/DoD.md`, `docs/api/openapi.yaml`
- Preview/Env (if exists): 

## Known issues / notes
- 

---

## Checklist (Feature-Lite)
- [ ] Lint green: `pnpm run backend:lint`
- [ ] Tests green: `pnpm run backend:test` (+ tests for 400/401/403/404/409 where relevant)
- [ ] OpenAPI updated (`docs/api/openapi.yaml`), `/docs` loads without errors; example request/response added
- [ ] Zod returns 400 with clear message for invalid input
- [ ] Structured logs: `info` on success; `warn/error` on failures; no secrets in logs
- [ ] UI (if relevant): consistent Loading/Error/Success (RTL/Hebrew OK)
- [ ] Manual smoke: one success (201/200) + one intended failure (400) pass
- [ ] PR description includes How to test + link to `/docs`; CI green
