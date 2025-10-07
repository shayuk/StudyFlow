# StudyFlow Backend (Local-Only)

This document defines the backend vision, scope, and local-first plan for StudyFlow. It complements the existing frontend and will not modify or break any UI without explicit approval.

- Goal: Student Bot Management System (SBMS) that powers student mentoring, course analytics, and lecturer dashboards.
- Mode: 100% local development. No cloud deployment or external managed services until we explicitly switch to a deployment phase.

## High-Level Objectives
- Manage lifecycle of Bots (student/lecturer): versions, tools, guardrails, A/B.
- Connect course knowledge, index for retrieval (RAG), and ground answers with citations.
- Power chat (SSE) with tool calls, study planning, and progress tracking.
- Provide lecturer insights and reports.

## Local Tech Stack (phase A)
- Runtime: Node.js (TypeScript)
- Framework: Express (simple, fast to MVP; can graduate to NestJS later if needed)
- DB: SQLite via Prisma (single file, easy to version/control in repo). Can migrate to PostgreSQL later with minimal changes.
- Vector DB (RAG): Qdrant (local Docker). We’ll gate RAG features until Qdrant is available locally.
- File Storage: Local `storage/` folder. (No cloud buckets.)
- Background jobs: Simple in-process queue to start (BullMQ/Redis optional later when needed).
- API schema: REST + SSE. OpenAPI contract in `docs/api/openapi.yaml` (to be created when endpoints are stubbed).
- Logging: JSON structured logs to console and local file `logs/app.log`.
- Tests: Vitest for unit/integration. No external mocks for dev; test doubles only for tests.

### Tooling & Versions

- Node.js: 20.x (enforced via `package.json` → `"engines": { "node": "20.x" }`).
- Package manager: pnpm. We do not use `package-lock.json` (removed to prevent CI conflicts); rely on `pnpm-lock.yaml`.
- Storybook/TypeScript: declare CSS modules via `.storybook/types.d.ts` with `declare module '*.css';` to avoid type errors in CI/build.

### בדיקת קובץ לוגים (CMD)
```cmd
if exist logs\app.log (echo קיים) else (echo לא קיים)
type logs\app.log
```

## Swagger UI (CMD)

Swagger UI נטען מ־`docs/api/openapi.json` אשר מסונכרן מתוך `docs/api/openapi.yaml`.

בדיקות מהירות:

```cmd
REM פתיחת מסך הדוקס (רענון קשיח)
REM כתובת: http://localhost:4000/docs  (Ctrl+F5)
```

סנכרון JSON מתוך YAML:

```cmd
pnpm -C server run docs:sync-openapi
```

## E2E Smoke — Local (CMD)

To run Playwright smoke tests locally against your frontend dev server:

```cmd
set BASE_URL=http://localhost:5173
pnpm run e2e:smoke
```

Notes:
- `BASE_URL` must point to a running frontend instance.
- Use Windows CMD `set` syntax (not PowerShell `$env:`).


## Security & Roles (local)
- Roles: `student`, `instructor`, `admin`.
- JWT contains: `sub`, `orgId`, `roles[]`, optional `courseId`.
- Authorization: per-route middleware checks role + ownership/org.
- Data privacy: store only necessary metadata for calendar/events; do not store free text unless explicitly enabled.

## Domain Model (initial subset)
- orgs, users, courses, enrollments
- bots, bot_versions, bot_instances
- knowledge_sources, documents, chunks (embeddings stored in Qdrant)
- conversations, messages
- plans, plan_sessions
- analytics (aggregates), reports, audit_log

Exact schema will be captured in Prisma and `docs/schema.prisma.md`.

## API (Initial Contracts)
- Auth & Me
  - GET `/api/me` → current user, roles, org
- Bots
  - POST `/api/bots`
  - POST `/api/bots/:botId/versions`
  - POST `/api/bots/:botId/deploy`
  - GET  `/api/bot-instances?courseId=...`
- Knowledge & Index
  - POST `/api/knowledge/sources`
  - POST `/api/knowledge/documents` (multipart)
  - POST `/api/knowledge/documents/:docId/index`
  - GET  `/api/knowledge/search?q=...&botInstanceId=...`
- Chat (SSE)
  - POST `/api/chat/start`
  - POST `/api/chat/:conversationId/message` (SSE stream)
- Planner
  - POST `/api/planner/plan`
  - POST `/api/planner/commit` (optional calendar write)
- Analytics & Reports
  - GET `/api/analytics/course/:courseId`
  - GET `/api/analytics/bot/:botId`
  - POST `/api/reports/weekly`

Errors: 400/401/403/404/409/422/429/500.

## Local Development (CMD only)
- Install dependencies:
```
pnpm install
```
- Run backend (will be added when scaffolded):
```
pnpm run backend:dev
```
- Run tests:
```
pnpm run test
```
- Start Qdrant locally (optional; required for RAG):
```
docker run -p 6333:6333 -v %cd%/qdrant_storage:/qdrant/storage qdrant/qdrant:latest
```

## Performance Targets (local)
- REST p95 < 250ms for non-LLM calls.
- Chat SSE: first token 0.8–2.5s when LLM integrated locally.
- Indexing a 50-page PDF < 2 minutes (async job).

## Roadmap (local-first)
1) Scaffold backend service with Express + TypeScript + Prisma (SQLite).
2) AuthN/Z: local JWT, role middleware, request scoping.
3) Minimal domain: orgs/users/courses/enrollments.
4) Bots: create version, deploy instance.
5) Knowledge upload → parse → chunk (store) → (later embed/index when Qdrant up).
6) Chat SSE stub (no LLM yet) → plumb storage of conversations/messages.
7) Planner algorithm (basic) using local data only.
8) Integrate Qdrant locally; add embeddings and hybrid search.
9) Basic analytics aggregates.
10) Calendar (ReadOnly) provider integration (deferred until core ready).

## Notes
- We will not alter any frontend code unless explicitly requested.
- We will avoid duplication and keep all new backend assets under a clear folder structure (to be proposed when scaffolding).

---

## Status
- Current: Backend scaffold under `server/` with AuthN/Z (Local JWT). Core domains (orgs/users/courses) and Bots routes are implemented and tested. Knowledge intake (upload → parse → chunk) and RAG search (Qdrant gated) are implemented and tested. Chat SSE stub works with citations. Planner is implemented and tested: `POST /api/planner/plan` generates sessions with conflict detection and persists `Plan` + `PlanSession`.
- Next Step: Analytics (Basics) — aggregates for course/bot/TA and a minimal `GET /api/analytics/course/:courseId` with tests.

---

## Coverage Policy (Staged)

- CI runs tests without coverage in the main job to keep pipelines green and fast.
- A separate, non-blocking job publishes coverage artifacts for visibility.
- We will gradually enforce coverage by raising thresholds as features stabilize:
  - Milestone reminders: after each major backend feature (Planner, Analytics, etc.), review coverage and consider +5% threshold.
  - When coverage is stable, make the coverage job blocking and set explicit thresholds in Vitest config.
- Scope: measure only `server/src/**` (exclude specs, generated code, and external adapters) when thresholds are introduced.

---

## Staging Deployment & Runbook (CMD only)

This project is local-first, but when a staging environment is needed for the pilot, follow this minimal, reproducible process.

### Environment variables
- Required (backend):
  - `JWT_SECRET` — HS256 secret for tokens
  - `DATABASE_URL` — Prisma connection string (SQLite file path or Postgres URL)
  - Optional: `LOG_LEVEL` (default `info`)

Store these securely in staging (e.g., GitHub Actions secrets, platform secrets).

### Build & run backend on staging
1) Install deps
```
pnpm install --frozen-lockfile
```
2) Generate Prisma client and run migrations
```
pnpm run backend:prisma:generate
```
3) Build and start backend
```
pnpm run backend:build
pnpm run backend:start
```

### Vercel notes (runtime & routing)

- Node runtime: Vercel will use Node 20 according to the repo `engines` field.
- `vercel.json` is minimal and routes traffic to the API handler without pinning a functions runtime:

```json
{
  "version": 2,
  "routes": [
    { "src": "/api/(.*)", "dest": "server/api/index.ts" },
    { "src": "/docs/(.*)", "dest": "server/api/index.ts" }
  ]
}
```

- Do not set `functions.runtime` in `vercel.json`; rely on platform defaults + `engines`.

### Seed data (idempotent)
Use a tiny dataset suitable for smoke tests (org, admin user, 1–2 courses):
```
pnpm run backend:seed
```
Run multiple times safely — seed should guard against duplicates.

### Health & smoke checks
- Backend health (adjust path if behind proxy):
```
curl -i https://<staging-host>/health
```
- Minimal E2E smoke (Playwright): ensure `BASE_URL` points to the staging frontend
```
set BASE_URL=https://<staging-frontend-url>
pnpm run e2e:smoke
```

### CI integration for staging E2E
- Set repository secret `STAGING_BASE_URL` to your staging frontend URL in GitHub:
  - Navigate: Settings → Secrets and variables → Actions → New repository secret
  - Name: `STAGING_BASE_URL`
  - Value: `https://<staging-frontend-url>`
- Workflow `/.github/workflows/e2e.yml` gates on this secret:
  - If set (non-empty): runs E2E smoke on pushes to `main` and on manual dispatch.
  - If empty: the job prints a skip notice and exits quickly.

### Logs & monitoring (basic)
- Logs are JSON to stdout via `pino`. Capture stdout from your process manager/platform.
- Consider wiring error reporting (e.g., Sentry) via env DSN. Mask PII.

### Backups & restore (database)
- Take a snapshot before each migration.
- Keep a rolling window of backups.
- Test a restore into a fresh staging DB at least once before the pilot.
