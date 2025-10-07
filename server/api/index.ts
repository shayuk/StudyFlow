import type { IncomingMessage, ServerResponse } from 'http';

// נשמור על אותה לוגיקה מקורית, רק נטען את המקור הנכון לפי סביבת הריצה:
// - ב-Vercel (Serverless) נטען מה-dist (שנבנה ע"י pnpm -C server build).
// - בלוקאל/DEV נטען מה-src כמו קודם.

const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

let app: any;
let ensureDefaultAdmin: () => Promise<unknown>;

if (IS_VERCEL) {
  // טעינה מהקוד המהודר (JavaScript) שנמצא תחת server/dist/**
  ({ app } = require('../dist/index.js'));
  ({ ensureDefaultAdmin } = require('../dist/bootstrap/ensureDefaultAdmin.js'));
} else {
  // התנהגות מקורית בלוקאל: טעינה ישירות מה-src
  ({ app } = require('../src/index'));
  ({ ensureDefaultAdmin } = require('../src/bootstrap/ensureDefaultAdmin'));
}

let seeded = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // One-time seeding on cold start (non-blocking) — בדיוק כמו במקור
  if (!seeded) {
    seeded = true;
    Promise.resolve(ensureDefaultAdmin?.()).catch(() => { /* suppress noisy cold start logs */ });
  }
  // העברה שקופה ל-Express app (כמו במקור)
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
