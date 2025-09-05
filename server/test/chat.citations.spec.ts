import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';

// Disable Qdrant to use fallback LIKE
process.env.QDRANT_DISABLED = 'true';

import chatRouter from '../src/routes/chat';
import { prisma } from '../src/db';
import { signToken, type JwtUser } from '../src/auth/jwt';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', chatRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const ORG = 'org_chat_cite_1';
const student = () => token({ sub: 'u_cite_s1', orgId: ORG, roles: ['student'] });

async function seedBotInstance() {
  await prisma.org.upsert({ where: { id: ORG }, create: { id: ORG, name: 'Org Cite' }, update: {} });
  const course = await prisma.course.create({ data: { name: 'Course Cite', orgId: ORG } });
  const bot = await prisma.bot.create({ data: { orgId: ORG, name: 'CiteBot', versions: { create: [{ status: 'published' }] } }, include: { versions: true } });
  const ver = bot.versions[0];
  const inst = await prisma.botInstance.create({ data: { botId: bot.id, versionId: ver.id, courseId: course.id } });
  return { inst };
}

async function seedKnowledgeSimple() {
  const source = await prisma.knowledgeSource.create({ data: { orgId: ORG, name: 'CiteSrc' } });
  const doc = await prisma.knowledgeDocument.create({ data: { orgId: ORG, sourceId: source.id, filename: 'notes.txt', mime: 'text/plain', size: 42, path: 'storage/notes.txt', status: 'ready' } });
  await prisma.knowledgeChunk.createMany({
    data: [
      { orgId: ORG, docId: doc.id, idx: 0, content: 'This chunk mentions Algebra and vectors.' },
      { orgId: ORG, docId: doc.id, idx: 1, content: 'Another chunk about Calculus.' },
    ],
  });
}

async function cleanup() {
  await prisma.message.deleteMany({ where: { conversation: { orgId: ORG } } });
  await prisma.conversation.deleteMany({ where: { orgId: ORG } });
  await prisma.botInstance.deleteMany({ where: { bot: { orgId: ORG } } });
  await prisma.botVersion.deleteMany({ where: { bot: { orgId: ORG } } });
  await prisma.bot.deleteMany({ where: { orgId: ORG } });
  await prisma.course.deleteMany({ where: { orgId: ORG } });
  await prisma.knowledgeChunk.deleteMany({ where: { orgId: ORG } });
  await prisma.knowledgeDocument.deleteMany({ where: { orgId: ORG } });
  await prisma.knowledgeSource.deleteMany({ where: { orgId: ORG } });
  await prisma.org.deleteMany({ where: { id: ORG } });
}

describe.sequential('Chat citations', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('non-streaming bot message persists citations JSON', async () => {
    const { inst } = await seedBotInstance();
    await seedKnowledgeSimple();

    const start = await request(app)
      .post('/api/chat/start')
      .set('Authorization', `Bearer ${student()}`)
      .send({ botInstanceId: inst.id })
      .expect(201);

    const conversationId = start.body.id as string;

    const send = await request(app)
      .post(`/api/chat/${conversationId}/message`)
      .set('Authorization', `Bearer ${student()}`)
      .send({ content: 'Tell me about algebra' })
      .expect(200);

    expect(send.body.bot).toHaveProperty('id');

    // Load from DB to inspect citations
    const botMsg = await prisma.message.findFirstOrThrow({ where: { conversationId, sender: 'bot' } });
    expect(botMsg.citations).toBeTypeOf('string');
    const cites = JSON.parse(botMsg.citations ?? '[]');
    expect(Array.isArray(cites)).toBe(true);
    expect(cites.length).toBeGreaterThan(0);
  });

  it('SSE final event includes citations array', async () => {
    const { inst } = await seedBotInstance();
    await seedKnowledgeSimple();

    const start = await request(app)
      .post('/api/chat/start')
      .set('Authorization', `Bearer ${student()}`)
      .send({ botInstanceId: inst.id })
      .expect(201);

    const conversationId = start.body.id as string;

    let raw = '';
    await request(app)
      .post(`/api/chat/${conversationId}/message?stream=1`)
      .set('Authorization', `Bearer ${student()}`)
      .set('Accept', 'text/event-stream')
      .send({ content: 'Explain vectors' })
      .buffer(true)
      .parse((res, cb) => {
        res.setEncoding('utf8');
        let finished = false;
        const finish = () => { if (!finished) { finished = true; cb(null, raw); } };
        const timer = setTimeout(finish, 20000); // safety guard (less than test timeout)
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => { clearTimeout(timer); finish(); });
        res.on('close', () => { clearTimeout(timer); finish(); });
        res.on('aborted', () => { clearTimeout(timer); finish(); });
      })
      .expect(200);

    const body: string = raw;
    // removed temporary RAW SSE dump logs
    const lines = body.split('\n\n').map((l) => l.trim()).filter(Boolean);
    // Find any JSON-bearing data line with done=true
    const dataLines = lines.filter((l) => l.startsWith('data: '));
    expect(dataLines.length).toBeGreaterThan(0);
    type FinalPayload = { done?: boolean; messageId?: string | null; citations?: unknown };
    let finalPayload: FinalPayload | null = null;
    for (const line of dataLines) {
      const text = line.slice('data: '.length);
      try {
        const obj = JSON.parse(text) as unknown;
        if (obj && typeof obj === 'object' && (obj as FinalPayload).done === true) finalPayload = obj as FinalPayload;
      } catch { /* ignore non-JSON chunks */ }
    }
    expect(finalPayload).not.toBeNull();
    const citations = (finalPayload as FinalPayload).citations;
    expect(Array.isArray(citations)).toBe(true);
    expect((citations as unknown[]).length).toBeGreaterThan(0);
  }, 25000);
});
