import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the compiled Express app (built via pnpm -C server build)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../server/dist/index.js');

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}

