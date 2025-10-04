import 'dotenv/config';
// Server Vitest setup: enforce strict auth in tests
process.env.DEV_AUTH_MODE = 'false';

// Optional: make test output stable
process.env.TZ = 'UTC';

// Mock pdf-parse globally to avoid reading external assets during tests
import { vi } from 'vitest';
vi.mock('pdf-parse', () => ({
  default: async (buf: Buffer | string) => ({
    text: Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf ?? ''),
  }),
}));
