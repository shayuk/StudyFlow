# StudyFlow Backend — Implementation Checklist (Local Only)

Use this checklist to progress step-by-step. Check items only when fully done and tested locally.

## 0) Repo Hygiene
- [x] Keep frontend untouched unless explicitly requested.
- [x] Backend lives under `server/` (to be created in step 1) and uses its own scripts.
- [x] Use pnpm. No cloud resources.

## 1) Scaffolding (Express + TS + Prisma/SQLite)
- [x] Create `server/` with TypeScript config, ESLint, and scripts.
- [x] Initialize Prisma with SQLite DB file at `server/prisma/dev.db`.
- [x] Add base Express app with health route `GET /health`.
- [x] Add logger (pino) and request tracing (request-id).
- [x] Add Vitest setup for unit tests.

## 2) AuthN/Z (Local JWT)
- [x] Define JWT secret in `.env` (local only, not committed).
- [x] Middleware to parse JWT and attach `user` (sub, orgId, roles[]).
- [x] Authorization helpers: `requireRole`, `requireOrg`, `requireOwnership`.
- [x] Seed script to generate test users/tokens.

## 3) Domain (Phase A — Minimal)
- [x] Prisma models: org, user, course, enrollment.
- [x] CRUD routes (minimal): create/list/update/delete courses within org.
- [x] RLS-like checks in middleware (org scoping + roles).
- [x] Unit tests for model constraints and authorization.

## 4) Bots Core
- [x] Models: bot, botVersion, botInstance.
- [x] POST `/api/bots` — create bot.
- [x] POST `/api/bots/:botId/versions` — create version (prompts, tools, temperature).
- [x] PATCH `/api/bot-versions/:versionId` — forward-only lifecycle transitions (draft → prepared → published).
- [x] POST `/api/bots/:botId/deploy` — create instance (courseId; select latest published version by default).
- [x] GET `/api/bot-instances?courseId=...` — list/deployments (scoped by org).
- [x] Tests cover core routes and constraints (see `server/test/bots.routes.spec.ts`).

## 5) Knowledge Intake (Upload → Parse → Chunk)
- [x] Storage folder `storage/` for uploads.
- [x] POST `/api/knowledge/sources` (create source).
- [x] POST `/api/knowledge/documents` (multipart upload).
- [x] Parse PDFs to text (hebrew/RTL aware), normalize, metadata.
- [x] Chunking strategy: 700–1200 chars, 100–150 overlap.
- [x] Persist chunks; embeddings deferred until Qdrant.
- [x] Job queue (in-memory) for parse/chunk pipeline.
- [x] Tests: sample PDF parse and chunk counts.

## 6) Chat (SSE) — Stub First
- [x] POST `/api/chat/start` — create conversation.
- [x] POST `/api/chat/:conversationId/message` — stream SSE with mock tokens.
- [x] Persist messages (user/assistant/tool) in DB.
- [x] Unit tests for SSE flow and storage.

## 7) Planner (Local)
- [x] Model: plans, planSessions.
- [x] POST `/api/planner/plan` — produce sessions from constraints.
- [x] Conflict detection against stored sessions.
- [x] Tests for back‑planning and daily caps.

## 8) RAG Enablement (Qdrant local)
- [x] Docker command documented in README to start Qdrant. (See `docs/BACKEND_README.md` → Local Development)
- [x] Embedding function (local stub) — `server/src/services/embeddings.ts`.
- [x] Index chunks into Qdrant with metadata (orgId, courseId, docId) — `processDocument()` in `server/src/services/knowledge.ts`.
- [x] GET `/api/knowledge/search` — hybrid baseline (vector via Qdrant if enabled; fallback LIKE) — `server/src/routes/knowledge.ts`.
- [x] Tests with tiny corpus — `server/test/knowledge.search.spec.ts` (uses fallback LIKE; Qdrant disabled for test).

Note: Qdrant usage is gated by env. In local/test it may be disabled with `QDRANT_DISABLED=true`; when not disabled, vector search runs and falls back safely on errors.

## 9) Analytics (Basics)
- [x] Basic aggregates for course from conversations/messages (counts + lastActivity).
- [x] GET `/api/analytics/course/:courseId`.
- [x] Tests on seeded data.

## 10) Calendar (ReadOnly — Optional after Core)
- [x] Provider interface and Google/Microsoft stub adapters (local only).
- [x] GET `/calendar/freebusy` from cached demo data (no OAuth yet).
- [x] Planner integrates free/busy windows.

## 11) Quality & Ops
- [x] Centralized error handler (problem+json) wired as last middleware.
- [x] Request validation (zod) — minimal applied to Courses (POST/PATCH) with 400 errors.
- [x] Rate limit (basic, per-IP) for local testing.
- [x] Structured logs to file `logs/app.log`.
- [x] OpenAPI spec in `docs/api/openapi.yaml` reflecting implemented routes.
- [x] Swagger UI available at `/docs` (serves `docs/api/openapi.json`, synced from `docs/api/openapi.yaml`); URL logged on startup.

- [x] `pnpm run backend:dev` — start server with nodemon/ts-node.
- [x] `pnpm run backend:test` — Vitest.
- [x] `pnpm run backend:seed` — seed demo org/users/courses.
- [x] `pnpm run backend:lint` — ESLint (clean; warnings only from generated `server/coverage/`).
- [x] E2E Smoke workflow configured in `.github/workflows/e2e.yml` (gated by `STAGING_BASE_URL`).
- [x] Document where to set `STAGING_BASE_URL` (repo secrets) and how to run locally with `BASE_URL`.
- [x] Local E2E run: `set BASE_URL=http://localhost:5173 && pnpm run e2e:smoke` (CMD).
- [x] Upload Playwright report as artifact in E2E workflow (optional).

## Done Criteria for Phase A (Local MVP)
- [x] All routes above functional locally and tested.
- [x] Planner produces sessions; chat streams SSE mock.
- [x] Knowledge pipeline parses and chunks documents.
- [x] Consistent error tests added (400/401/403/404/409 where applicable).
{{ ... }}

---

## Next Step (planned)
- Proceed with Section 11: Quality & Ops — request validation (zod) with 400 errors, basic per‑IP rate limit (local/test), structured logs to `logs/app.log`, and minimal OpenAPI spec in `docs/api/openapi.yaml`.

---

## Follow-up Tasks (Non‑Blocking)
- [ ] Set `STAGING_BASE_URL` in GitHub repository secrets after staging frontend is deployed (see `docs/BACKEND_README.md` → CI integration for staging E2E).
