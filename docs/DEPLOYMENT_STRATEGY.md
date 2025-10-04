# Deployment Strategy — Config Snippets

This document contains concrete, copy-paste ready snippets for CORS, SSE, helmet, and ENV usage. Replace placeholders with your domains.

---

## 1) CORS — focused allowlist
File: `server/src/index.ts` (or a dedicated `CORS.ts`)
```ts
import cors from 'cors';
import type { Request } from 'express';

const allowedOrigins = [
  'https://<your-preview>.vercel.app',
  'https://<your-prod-domain>',
  'http://localhost:5173',
];

export const corsMiddleware = cors({
  origin: (origin: string | undefined, cb) => {
    if (!origin) return cb(null, true); // local tools / curl
    return cb(null, allowedOrigins.includes(origin));
  },
  credentials: true,
});
```
Usage:
```ts
import express from 'express';
import { corsMiddleware } from './CORS';

const app = express();
app.use(corsMiddleware);
```

---

## 2) Security — helmet
File: `server/src/index.ts`
```ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: false, // adjust if CSP is configured separately
  crossOriginEmbedderPolicy: false,
}));
```

---

## 3) SSE — stable streaming route
Files: `server/src/sseRoute.ts`, register in `index.ts`
```ts
// server/src/sseRoute.ts
import type { Request, Response } from 'express';

const KEEPALIVE_MS = 25_000;

export function sseHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  res.write(':ok\n\n');

  const keepalive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, KEEPALIVE_MS);

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('welcome', { ok: true });

  req.on('close', () => {
    clearInterval(keepalive);
  });
}
```
Register + compression exclusion:
```ts
import compression from 'compression';
import { sseHandler } from './sseRoute';

app.use(
  compression({
    filter: (req, _res) => {
      if (req.path.startsWith('/api/stream')) return false;
      return true;
    },
  })
);

app.get('/api/stream', sseHandler);
```

---

## 4) ENV — principles
- Backend secrets (JWT/DB/API keys): set only in Vercel Project → Settings → Environment Variables.
- Frontend env must be public (Vite: `VITE_*` / Next: `NEXT_PUBLIC_*`).
- Never log secrets. After changing Vercel env, Redeploy.

---

## 5) CMD quick refs
- Lint & tests:
```cmd
pnpm run backend:lint
pnpm run backend:test
```
- Local smoke (example):
```cmd
curl -i http://localhost:4000/health
```
- Prisma migrate (staging/prod):
```cmd
pnpm prisma migrate deploy
```

---

## 6) CORS allowlist examples
- Staging:
```
https://<firebase-preview>.web.app
https://<vercel-preview>.vercel.app
http://localhost:5173
```
- Production:
```
https://<ui-prod-domain>
https://<api-prod-domain>
```

---

## 7) Checklist additions (copy to DoD Release)
- SSE route configured with: `no-transform`, keep-alive ping, compression excluded.
- ENV separated: secrets only on backend; public vars on frontend.
- CORS hardened to staging/prod + localhost.
- Observability: single drain/provider for API logs; manual ERROR alert test once.
