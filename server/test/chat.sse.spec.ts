import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/db';
import chatRouter from '../src/routes/chat';
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

const ORG_A = 'org_chat_sse_1';
const ORG_B = 'org_chat_sse_2';
const studentA = () => token({ sub: 'u_sse_s1', orgId: ORG_A, roles: ['student'] });
const adminA = () => token({ sub: 'u_sse_a1', orgId: ORG_A, roles: ['admin'] });
const studentB = () => token({ sub: 'u_sse_s2', orgId: ORG_B, roles: ['student'] });

async function seedBotInstanceForOrgA() {
  await prisma.org.upsert({ where: { id: ORG_A }, create: { id: ORG_A, name: 'Chat SSE Org A' }, update: {} });
  const course = await prisma.course.create({ data: { name: 'Chat SSE Course A', orgId: ORG_A } });
  const bot = await prisma.bot.create({
    data: {
      orgId: ORG_A,
      name: 'ChatBotSSE',
      versions: { create: [{ status: 'published' }] },
    },
    include: { versions: true },
  });
  const ver = bot.versions[0];
  const inst = await prisma.botInstance.create({ data: { botId: bot.id, versionId: ver.id, courseId: course.id } });
  return { course, bot, ver, inst };
}

async function cleanupOrgs() {
  const ORGS = [ORG_A, ORG_B];
  await prisma.message.deleteMany({ where: { conversation: { orgId: { in: ORGS } } } });
  await prisma.conversation.deleteMany({ where: { orgId: { in: ORGS } } });
  await prisma.botInstance.deleteMany({ where: { bot: { orgId: { in: ORGS } } } });
  await prisma.botVersion.deleteMany({ where: { bot: { orgId: { in: ORGS } } } });
  await prisma.bot.deleteMany({ where: { orgId: { in: ORGS } } });
  await prisma.course.deleteMany({ where: { orgId: { in: ORGS } } });
  await prisma.org.deleteMany({ where: { id: { in: ORGS } } });
}

describe.sequential('Chat SSE routes (stream, persistence, org scoping)', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanupOrgs();
  });

  afterAll(async () => {
    await cleanupOrgs();
    await prisma.$disconnect();
  });

  it('POST message with ?stream=1 returns SSE chunks and persists bot reply', async () => {
    const { inst } = await seedBotInstanceForOrgA();

    const start = await request(app)
      .post('/api/chat/start')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ botInstanceId: inst.id })
      .expect(201);
    const conversationId = start.body.id as string;

    let raw = '';
    const res = await request(app)
      .post(`/api/chat/${conversationId}/message?stream=1`)
      .set('Authorization', `Bearer ${studentA()}`)
      .set('Accept', 'text/event-stream')
      .send({ content: 'Hello SSE bot' })
      .buffer(true)
      .parse((res, cb) => {
        res.on('data', (chunk: Buffer) => {
          raw += chunk.toString('utf8');
        });
        res.on('end', () => cb(null, raw));
      })
      .expect(200);

    // Content-Type should be event-stream
    expect(res.headers['content-type']).toContain('text/event-stream');

    // Should contain at least one data line and a final done event
    expect(raw).toContain('data:');
    expect(raw).toContain('done');

    // Verify persistence of two messages (user + bot)
    const hist = await request(app)
      .get(`/api/chat/${conversationId}/messages`)
      .set('Authorization', `Bearer ${studentA()}`)
      .expect(200);

    expect(hist.body.items.length).toBe(2);
    expect(hist.body.items[0].sender).toBe('user');
    expect(hist.body.items[1].sender).toBe('bot');
  });

  it('Org scoping: another org cannot stream to this conversation', async () => {
    const { inst } = await seedBotInstanceForOrgA();

    const start = await request(app)
      .post('/api/chat/start')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ botInstanceId: inst.id })
      .expect(201);
    const conversationId = start.body.id as string;

    await request(app)
      .post(`/api/chat/${conversationId}/message?stream=1`)
      .set('Authorization', `Bearer ${studentB()}`)
      .set('Accept', 'text/event-stream')
      .send({ content: 'Cross org stream' })
      .expect(403);
  });
});
