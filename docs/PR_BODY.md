# Documentation/Testing PR (Phase A)

## Summary
- OpenAPI 3.1 lint fixes + sync JSON
- Calendar service: stricter IANA timezone validation
- Bots routes: stable listing of bot instances
- Service tests (calendar/llm/qdrant) and raised coverage thresholds to 75/65
- Backend checklist updated (Phase A Done)

## OpenAPI
- Add `license`, tag descriptions, `operationId`s, and 4xx on `/health`.
- Replace `nullable: true` with `type: [T, 'null']` per 3.1.
- Add `200` example for `GET /api/calendar/freebusy`.
- Sync `docs/api/openapi.json`.

## Calendar
- Validate IANA tz using `Intl.DateTimeFormat` in `server/src/services/calendar.ts`.
- Tests: `server/test/calendar.service.spec.ts` cover create/update/list/delete and validations.

## Bots
- Harden `GET /api/bot-instances` query in `server/src/routes/bots.ts`:
  - Filter by org in SQL: `bot: { is: { orgId } }`.
  - Require existing version: `version: { is: {} }`.
  - Minimal selects for relations.

## Services Tests
- `server/test/llm.service.spec.ts`: fallback streams in test env and provider override path.
- `server/test/qdrant.service.spec.ts`: HTTP stubs for ensureCollection/upsert/search.

## Coverage
- Re-include calendar service in coverage; add smoke tests for LLM/Qdrant.
- Raise coverage thresholds to `75/65` in `server/vitest.config.ts`.

## Checklist
- [x] All unit/integration tests passing locally.
- [x] OpenAPI lint/bundle passes.
- [x] No breaking API changes.
- [x] Documentation updated: `docs/BACKEND_CHECKLIST.md`.

## Notes
- Rate limit is local/test only.
- No prod env variable changes.
