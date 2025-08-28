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
- [ ] Models: bot, botVersion, botInstance.
- [ ] POST `/api/bots` — create bot.
- [ ] POST `/api/bots/:botId/versions` — create version (model, prompts, tools).
- [ ] POST `/api/bots/:botId/deploy` — create instance (courseId, TA, AB group).
- [ ] GET `/api/bot-instances?courseId=...` — list/deployments.
- [ ] Tests for version state machine and deploy constraints.

## 5) Knowledge Intake (Upload → Parse → Chunk)
- [ ] Storage folder `storage/` for uploads.
- [ ] POST `/api/knowledge/sources` (create source).
- [ ] POST `/api/knowledge/documents` (multipart upload).
- [ ] Parse PDFs to text (hebrew/RTL aware), normalize, metadata.
- [ ] Chunking strategy: 700–1200 chars, 100–150 overlap.
- [ ] Persist chunks; embeddings deferred until Qdrant.
- [ ] Job queue (in-memory) for parse/chunk pipeline.
- [ ] Tests: sample PDF parse and chunk counts.

## 6) Chat (SSE) — Stub First
- [ ] POST `/api/chat/start` — create conversation.
- [ ] POST `/api/chat/:conversationId/message` — stream SSE with mock tokens.
- [ ] Persist messages (user/assistant/tool) in DB.
- [ ] Unit tests for SSE flow and storage.

## 7) Planner (Local)
- [ ] Model: plans, planSessions.
- [ ] POST `/api/planner/plan` — produce sessions from constraints.
- [ ] Conflict detection against stored sessions.
- [ ] Tests for back‑planning and daily caps.

## 8) RAG Enablement (Qdrant local)
- [ ] Docker command documented in README to start Qdrant.
- [ ] Embedding function (pluggable; local stub or open-source model).
- [ ] Index chunks into Qdrant with metadata (orgId, courseId, docId).
- [ ] GET `/api/knowledge/search` — hybrid baseline (BM25 local + vector).
- [ ] Tests with tiny corpus.

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
- [ ] `pnpm run backend:lint` — ESLint.

## Done Criteria for Phase A (Local MVP)
- [ ] All routes above functional locally and tested.
- [ ] Planner produces sessions; chat streams SSE mock.
- [ ] Knowledge pipeline parses and chunks documents.
- [ ] No changes made to frontend without approval.

---

Status is tracked in this file and via tasks. Commit frequently and keep changes isolated per file as per project rules.

---

## Next Step (planned)
- Proceed with Section 3: Domain (Phase A — Minimal) — Prisma models and minimal course CRUD with org scoping.
