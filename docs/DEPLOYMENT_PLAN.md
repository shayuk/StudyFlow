# Deployment Plan — StudyFlow

This document summarizes our final deployment approach for Frontend (Firebase Hosting) and Backend (Vercel), including environments, security, CORS, SSE, observability, and CI hooks.

---

## Architecture Overview
- **Frontend (UI)**: Firebase Hosting (static app; Vite/React). Uses Preview Channels per PR if desired.
- **Backend (API)**: Vercel (Node/Express server). Preview deployments per PR. SSE/Streaming supported.
- **Data/Auth**: Firebase (Auth, Firestore/Realtime DB, Storage, FCM) as needed. Secrets only on backend.
- **Separation**: Independent deploys. Distinct env vars and permissions. CORS whitelisted UI domains only.

---

## Environments
- **Local**: `http://localhost:5173` (UI) ↔ `http://localhost:4000` (API)
- **Staging**:
  - UI: `https://<firebase-preview>.web.app` or `https://<project-staging>.web.app`
  - API: `https://<vercel-preview>.vercel.app`
- **Production**:
  - UI: `https://<project-prod>.web.app` (or custom domain)
  - API: `https://api.<domain>` (Vercel custom domain or default)

---

## Backend on Vercel

### 1) Account & Project
- Sign up to Vercel (GitHub SSO), import repo `shayuk/StudyFlow`.
- Framework: Node/Express. Output: Serverless functions (or Node server if configured).

### 2) Environment Variables (Vercel → Project → Settings → Environment Variables)
- Store only secrets here (JWT keys, DB URLs, third-party API keys). Do not expose to frontend.
- After changes, trigger Redeploy.

### 3) CORS (server/src/index.ts)
- Whitelist only staging/prod UI domains + localhost:
```ts
import cors from 'cors';
const allowed = [
  'https://<firebase-preview>.web.app',
  'https://<ui-prod-domain>',
  'http://localhost:5173',
];
app.use(cors({
  origin: (o, cb) => cb(null, !o || allowed.includes(o)),
  credentials: true,
}));
```

### 4) Security
- Enable `helmet` in Express. Avoid logging secrets. Use structured logs.
- Rate-limit basic for dev/test.

### 5) SSE / Streaming
- For SSE routes:
  - Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`.
  - Keepalive ping every ~25s: `res.write(':keepalive\n\n')`.
  - Exclude SSE path from compression/buffering.

### 6) Observability
- Keep logs structured to `logs/app.log` (locally) and connect a simple drain/provider on Vercel.
- Alert: ERROR in API → email/Slack (basic rule is fine).

---

## Frontend on Firebase Hosting

### 1) Account & Project
- Sign up to Firebase, create project. Enable Hosting. (Auth/Firestore/etc. as needed.)

### 2) Init & Config
- `firebase init hosting` (once), or configure via Firebase Console.
- Set `public` to your build directory (e.g., `dist`).
- Configure redirects/rewrite if needed.

### 3) Environment (public only)
- Frontend env must be public-only (Vite: `VITE_*`), never secrets.
- Point API base URL to Vercel staging/prod respectively.

### 4) Deploy
- Build UI, then `firebase deploy --only hosting`.
- Optional: Preview Channels per PR for UI testing.

---

## CI/CD and E2E
- GitHub Secrets: set `STAGING_BASE_URL` to the staging UI URL (or API if workflow expects it per docs).
- E2E smoke workflow triggers on PR/Push. Uses `STAGING_BASE_URL`.
- Keep PRs small; rely on `.github/pull_request_template.md` and `docs/DoD.md`.

---

## Checklists

### Release (Staging) — condensed
- [ ] CI green (lint + unit + smoke)
- [ ] Vercel: env vars set, redeploy after changes
- [ ] Firebase: Hosting configured; deploy preview/prod as needed
- [ ] CORS tight: Preview/Prod + localhost only
- [ ] Security: helmet active; no secrets in logs
- [ ] SSE route: no-transform, keep-alive, no compression on path; connection > 60s
- [ ] Migrations: `prisma migrate deploy` green; seed (if any) green
- [ ] Observability: no unexpected ERRORs during smoke
- [ ] PR Release: links to Preview + `/docs` + known issues

### Feature (Lite) — recap
- [ ] `pnpm run backend:lint` green
- [ ] `pnpm run backend:test` green; tests for 400/401/403/404/409 where relevant
- [ ] OpenAPI updated; `/docs` loads; example request/response present
- [ ] Zod 400 with clear message
- [ ] Logs: info on success; warn/error on failures; no secrets
- [ ] UI (if relevant): Loading/Error/Success (RTL/Hebrew OK)
- [ ] Manual smoke: one success (201/200) + one intended failure (400)
- [ ] PR includes How to test + link to `/docs`; CI green

---

## Onboarding Steps (once)
// turbo
1) Vercel: Sign up, import repo, set env vars, initial deploy.
2) Firebase: Create project, enable Hosting, connect repo (optional), first deploy.
3) GitHub Secrets: set `STAGING_BASE_URL`.
4) Harden CORS and enable helmet; verify SSE path config.

---

## Notes
- We keep UI and API separable to reduce cross-blast radius, simplify rollbacks, and minimize vendor lock-in.
- All configs should be documented under `docs/` to ease future migrations.
