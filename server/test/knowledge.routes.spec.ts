import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';

// Mock pdf-parse to avoid reading external test assets from the library during Vitest
vi.mock('pdf-parse', () => ({
  default: async (buf: Buffer | string) => ({ text: Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf) }),
}));

import knowledgeRouter from '../src/routes/knowledge';
import { prisma } from '../src/db';
import { signToken, JwtUser } from '../src/auth/jwt';

// Build a minimal app for testing, mounting only the knowledge router under /api
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', knowledgeRouter);
  return app;
}

// Helper to issue tokens like other specs
function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const instrA = () => token({ sub: 'u_instr_1', orgId: 'org_demo_1', roles: ['instructor'] });

describe.sequential('Knowledge intake routes (upload → parse → chunk)', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  }, 20000);

  beforeEach(async () => {
    // Clean test org data
    const ORG = 'org_demo_1';
    await prisma.knowledgeChunk.deleteMany({ where: { orgId: ORG } });
    await prisma.knowledgeDocument.deleteMany({ where: { orgId: ORG } });
    await prisma.knowledgeSource.deleteMany({ where: { orgId: ORG } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates source, uploads doc, and produces chunks', async () => {
    // 1) Create source
    const sourceRes = await request(app)
      .post('/api/knowledge/sources')
      .set('Authorization', `Bearer ${instrA()}`)
      .send({ name: 'Spec Source', meta: '{"course":"TEST101"}' })
      .expect(201);

    const sourceId: string = sourceRes.body.id;
    expect(typeof sourceId).toBe('string');

    // 2) Upload a small text document via multipart using in-memory buffer
    const text = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}. This is a sample line for chunking.`).join('\n');
    const uploadRes = await request(app)
      .post('/api/knowledge/documents')
      .set('Authorization', `Bearer ${instrA()}`)
      .field('sourceId', sourceId)
      .attach('file', Buffer.from(text, 'utf8'), {
        filename: 'sample.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    const docId: string = uploadRes.body.id;
    expect(typeof docId).toBe('string');
    expect(uploadRes.body.status).toBe('uploaded');

    // 3) Poll status until ready (with timeout)
    const started = Date.now();
    const timeoutMs = 15000; // 15s should be ample for tiny text
    let status = uploadRes.body.status as string;
    let chunks = 0;

    while (Date.now() - started < timeoutMs) {
      const st = await request(app)
        .get(`/api/knowledge/documents/${docId}`)
        .set('Authorization', `Bearer ${instrA()}`)
        .expect(200);
      status = st.body.status;
      chunks = st.body.chunks ?? 0;
      if (status === 'ready') break;
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(status).toBe('ready');
    expect(chunks).toBeGreaterThan(0);
  });
});
