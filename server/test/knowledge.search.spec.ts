import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';

// Force-disable Qdrant for this spec to avoid external dependency
process.env.QDRANT_DISABLED = 'true';

// Mock pdf-parse to avoid reading external assets
vi.mock('pdf-parse', () => ({
  default: async (buf: Buffer | string) => ({ text: Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf) }),
}));

import knowledgeRouter from '../src/routes/knowledge';
import { prisma } from '../src/db';
import { signToken, type JwtUser } from '../src/auth/jwt';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', knowledgeRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const ORG = 'org_search_1';
const instr = () => token({ sub: 'u_search_i1', orgId: ORG, roles: ['instructor'] });
const student = () => token({ sub: 'u_search_s1', orgId: ORG, roles: ['student'] });

async function cleanupOrg() {
  await prisma.knowledgeChunk.deleteMany({ where: { orgId: ORG } });
  await prisma.knowledgeDocument.deleteMany({ where: { orgId: ORG } });
  await prisma.knowledgeSource.deleteMany({ where: { orgId: ORG } });
}

describe.sequential('Knowledge search endpoint (fallback LIKE mode)', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanupOrg();
  });

  afterAll(async () => {
    await cleanupOrg();
    await prisma.$disconnect();
  });

  it('returns results for a simple text corpus', async () => {
    // Create source
    const src = await request(app)
      .post('/api/knowledge/sources')
      .set('Authorization', `Bearer ${instr()}`)
      .send({ name: 'SearchSrc' })
      .expect(201);
    const sourceId = src.body.id as string;

    // Upload doc
    const content = 'Algebra is the study of mathematical symbols. Calculus studies change. Algebra appears again.';
    const up = await request(app)
      .post('/api/knowledge/documents')
      .set('Authorization', `Bearer ${instr()}`)
      .field('sourceId', sourceId)
      .attach('file', Buffer.from(content, 'utf8'), { filename: 'math.txt', contentType: 'text/plain' })
      .expect(201);
    const docId = up.body.id as string;

    // Wait until ready
    const started = Date.now();
    let status = up.body.status as string;
    while (Date.now() - started < 10000 && status !== 'ready') {
      const st = await request(app)
        .get(`/api/knowledge/documents/${docId}`)
        .set('Authorization', `Bearer ${instr()}`)
        .expect(200);
      status = st.body.status;
      if (status === 'ready') break;
      await new Promise((r) => setTimeout(r, 150));
    }
    expect(status).toBe('ready');

    // Search (as student)
    const search = await request(app)
      .get('/api/knowledge/search')
      .set('Authorization', `Bearer ${student()}`)
      .query({ q: 'algebra', limit: 3 })
      .expect(200);

    expect(Array.isArray(search.body.items)).toBe(true);
    expect(search.body.items.length).toBeGreaterThan(0);
    const first = search.body.items[0];
    expect(first).toHaveProperty('docId');
    expect(first).toHaveProperty('idx');
    expect(first).toHaveProperty('content');
    expect(first).toHaveProperty('score');
  });
});
