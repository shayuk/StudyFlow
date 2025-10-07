import type { IncomingMessage, ServerResponse } from 'http';

const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

let app: any;
let ensureDefaultAdmin: () => Promise<unknown>;

if (IS_VERCEL) {
  ({ app } = require('../dist/index.js'));
  ({ ensureDefaultAdmin } = require('../dist/bootstrap/ensureDefaultAdmin.js'));
} else {
  ({ app } = require('../src/index'));
  ({ ensureDefaultAdmin } = require('../src/bootstrap/ensureDefaultAdmin'));
}

let seeded = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!seeded) {
    seeded = true;
    Promise.resolve(ensureDefaultAdmin?.()).catch(() => { /* suppress noisy cold start logs */ });
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
