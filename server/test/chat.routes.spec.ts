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

const ORG_A = 'org_chat_1';
const ORG_B = 'org_chat_2';
const studentA = () => token({ sub: 'u_chat_s1', orgId: ORG_A, roles: ['student'] });
const adminA = () => token({ sub: 'u_chat_a1', orgId: ORG_A, roles: ['admin'] });
const studentB = () => token({ sub: 'u_chat_s2', orgId: ORG_B, roles: ['student'] });

async function seedBotInstanceForOrgA() {
  await prisma.org.upsert({ where: { id: ORG_A }, create: { id: ORG_A, name: 'Chat Org A' }, update: {} });
  const course = await prisma.course.create({ data: { name: 'Chat Course A', orgId: ORG_A } });
  const bot = await prisma.bot.create({
    data: {
      orgId: ORG_A,
      name: 'ChatBot',
      versions: {
        create: [{ status: 'published' }],
      },
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

describe.sequential('Chat routes (start, message, history, org scoping)', () => {
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

  it('POST /api/chat/start creates a conversation scoped to org and bot instance', async () => {
    const { inst } = await seedBotInstanceForOrgA();

    const res = await request(app)
      .post('/api/chat/start')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ botInstanceId: inst.id, pageId: 'page1' })
      .expect(201);

    expect(res.body).toMatchObject({ orgId: ORG_A, botInstanceId: inst.id, pageId: 'page1' });
  });

  it('POST message echoes a stub bot reply and persists both', async () => {
    const { inst } = await seedBotInstanceForOrgA();

    const start = await request(app)
      .post('/api/chat/start')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ botInstanceId: inst.id })
      .expect(201);
    const conversationId = start.body.id as string;

    const send = await request(app)
      .post(`/api/chat/${conversationId}/message`)
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ content: 'Hello bot' })
      .expect(200);

    expect(send.body.user).toMatchObject({ sender: 'user', content: 'Hello bot' });
    expect(send.body.bot).toMatchObject({ sender: 'bot' });

    const hist = await request(app)
      .get(`/api/chat/${conversationId}/messages`)
      .set('Authorization', `Bearer ${studentA()}`)
      .expect(200);

    expect(hist.body.items.length).toBe(2);
    expect(hist.body.items[0].sender).toBe('user');
    expect(hist.body.items[1].sender).toBe('bot');
  });

  it('Org scoping: another org cannot access conversation', async () => {
    const { inst } = await seedBotInstanceForOrgA();

    const start = await request(app)
      .post('/api/chat/start')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ botInstanceId: inst.id })
      .expect(201);
    const conversationId = start.body.id as string;

    await request(app)
      .post(`/api/chat/${conversationId}/message`)
      .set('Authorization', `Bearer ${studentB()}`)
      .send({ content: 'Cross org' })
      .expect(403);

    await request(app)
      .get(`/api/chat/${conversationId}/messages`)
      .set('Authorization', `Bearer ${studentB()}`)
      .expect(403);
  });
});
