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
- [ ] Model: plans, planSessions.
- [ ] POST `/api/planner/plan` — produce sessions from constraints.
- [ ] Conflict detection against stored sessions.
- [ ] Tests for back‑planning and daily caps.

## 8) RAG Enablement (Qdrant local)
- [x] Docker command documented in README to start Qdrant. (See `docs/BACKEND_README.md` → Local Development)
- [x] Embedding function (local stub) — `server/src/services/embeddings.ts`.
- [x] Index chunks into Qdrant with metadata (orgId, courseId, docId) — `processDocument()` in `server/src/services/knowledge.ts`.
- [x] GET `/api/knowledge/search` — hybrid baseline (vector via Qdrant if enabled; fallback LIKE) — `server/src/routes/knowledge.ts`.
- [x] Tests with tiny corpus — `server/test/knowledge.search.spec.ts` (uses fallback LIKE; Qdrant disabled for test).

Note: Qdrant usage is gated by env. In local/test it may be disabled with `QDRANT_DISABLED=true`; when not disabled, vector search runs and falls back safely on errors.

## 9) Analytics (Basics)
- [ ] Aggregations for course/bot/TA from conversations/events.
- [ ] GET `/api/analytics/course/:courseId`.
- [ ] Tests on seeded data.

## 10) Calendar (ReadOnly — Optional after Core)
- [ ] Provider interface and Google/Microsoft stub adapters (local only).
- [ ] GET `/calendar/freebusy` from cached demo data (no OAuth yet).
- [ ] Planner integrates free/busy windows.

## 11) Quality & Ops
- [ ] Error handler with problem+json format.
- [ ] Request validation (zod) with 400 errors.
- [ ] Rate limit (basic, per-IP) for local testing.
- [ ] Structured logs to file `logs/app.log`.
- [ ] OpenAPI spec in `docs/api/openapi.yaml` reflecting implemented routes.

## 12) DX & Scripts (CMD)
- [x] `pnpm run backend:dev` — start server with nodemon/ts-node.
- [x] `pnpm run backend:test` — Vitest.
- [x] `pnpm run backend:seed` — seed demo org/users/courses.
- [x] `pnpm run backend:lint` — ESLint (clean; warnings only from generated `server/coverage/`).

## Done Criteria for Phase A (Local MVP)
- [ ] All routes above functional locally and tested.
- [ ] Planner produces sessions; chat streams SSE mock.
- [x] Knowledge pipeline parses and chunks documents.
- [ ] No changes made to frontend without approval.

---

Status is tracked in this file and via tasks. Commit frequently and keep changes isolated per file as per project rules.

---

## Next Step (planned)
- Proceed with Section 7: Planner (Local) — models (`Plan`, `PlanSession`), POST `/api/planner/plan`, conflict detection, and tests for back‑planning and daily caps.
