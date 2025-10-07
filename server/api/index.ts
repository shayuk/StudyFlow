import type { IncomingMessage, ServerResponse } from 'http';

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

let app: ExpressHandler;
let ensureDefaultAdmin: () => Promise<unknown>;

// נטען מה-dist ב-Vercel; אם נכשל (למשל הרצה לוקאלית של vercel dev) ננסה מ-src
try {
  if (IS_VERCEL) {
    ({ app } = require('../dist/index.js'));
    ({ ensureDefaultAdmin } = require('../dist/bootstrap/ensureDefaultAdmin.js'));
  } else {
    ({ app } = require('../src/index'));
    ({ ensureDefaultAdmin } = require('../src/bootstrap/ensureDefaultAdmin'));
  }
} catch (e) {
  // Fallback ל-src אם dist לא קיים
  ({ app } = require('../src/index'));
  ({ ensureDefaultAdmin } = require('../src/bootstrap/ensureDefaultAdmin'));
}

let seeded = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!seeded) {
    seeded = true;
    Promise.resolve(ensureDefaultAdmin?.()).catch(() => {
      /* suppress noisy cold start logs */
    });
  }
  return app(req, res);
}
