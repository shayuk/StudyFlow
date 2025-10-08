import type { IncomingMessage, ServerResponse } from 'http';
import { app } from '../src/index';
import { ensureDefaultAdmin } from '../src/bootstrap/ensureDefaultAdmin';

let seeded = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // One-time seeding on cold start (non-blocking)
  if (!seeded) {
    seeded = true;
    ensureDefaultAdmin().catch(() => { /* suppress noisy cold start logs */ });
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
