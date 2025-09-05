import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/db';
import botsRouter from '../src/routes/bots';
import { signToken, type JwtUser } from '../src/auth/jwt';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api', botsRouter);
  return app;
}

function token(payload: Partial<JwtUser> & Pick<JwtUser, 'sub' | 'orgId' | 'roles'>) {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test_secret_key';
  return signToken({ ...payload });
}

const ORG_A = 'org_bots_1';
const ORG_B = 'org_bots_2';
const adminA = () => token({ sub: 'u_admin_1', orgId: ORG_A, roles: ['admin'] });
const instrA = () => token({ sub: 'u_instr_1', orgId: ORG_A, roles: ['instructor'] });
const studentA = () => token({ sub: 'u_stud_1', orgId: ORG_A, roles: ['student'] });

// removed unused adminB helper

describe.sequential('Bots Core routes', () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    // cleanup only within this suite's orgs to avoid cross-file interference
    const ORGS = [ORG_A, ORG_B];
    await prisma.botKnowledgeAsset.deleteMany({ where: { version: { bot: { orgId: { in: ORGS } } } } });
    await prisma.botInstance.deleteMany({ where: { bot: { orgId: { in: ORGS } } } });
    await prisma.botVersion.deleteMany({ where: { bot: { orgId: { in: ORGS } } } });
    await prisma.bot.deleteMany({ where: { orgId: { in: ORGS } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/bots returns empty initially', async () => {
    const res = await request(app)
      .get('/api/bots')
      .set('Authorization', `Bearer ${adminA()}`)
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(0);
  });

  it('POST /api/bots creates a bot for instructor/admin; student forbidden', async () => {
    await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${studentA()}`)
      .send({ name: 'Should Fail' })
      .expect(403);

    const create = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${instrA()}`)
      .send({ name: 'Study Assistant', persona: 'Helpful tutor' })
      .expect(201);
    expect(create.body).toMatchObject({ name: 'Study Assistant' });

    const list = await request(app)
      .get('/api/bots')
      .set('Authorization', `Bearer ${adminA()}`)
      .expect(200);
    expect(list.body.items.length).toBe(1);
  });

  it('POST versions and enforce lifecycle transitions', async () => {
    // create bot
    const bot = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'Lifecycle Bot' })
      .expect(201);
    const botId = bot.body.id as string;

    // create version (draft)
    const v = await request(app)
      .post(`/api/bots/${botId}/versions`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ prompts: { system: 'You are helpful' }, tools: ['rag.search'] })
      .expect(201);
    const versionId = v.body.id as string;
    expect(v.body.status).toBe('draft');

    // invalid jump draft -> published
    await request(app)
      .patch(`/api/bot-versions/${versionId}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ status: 'published' })
      .expect(409);

    // valid step to prepared
    const v2 = await request(app)
      .patch(`/api/bot-versions/${versionId}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ status: 'prepared' })
      .expect(200);
    expect(v2.body.status).toBe('prepared');

    // valid step to published
    const v3 = await request(app)
      .patch(`/api/bot-versions/${versionId}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ status: 'published' })
      .expect(200);
    expect(v3.body.status).toBe('published');

    // invalid backward move published -> draft
    await request(app)
      .patch(`/api/bot-versions/${versionId}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ status: 'draft' })
      .expect(409);
  });

  it('Deploy requires published version; then deploy succeeds and instances list is org-filtered', async () => {
    // org and course
    await prisma.org.upsert({ where: { id: ORG_A }, create: { id: ORG_A, name: 'Bots Org A' }, update: {} });
    const course = await prisma.course.create({ data: { name: 'Course A', orgId: ORG_A } });

    // create bot and draft version
    const bot = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ name: 'Deployer' })
      .expect(201);
    const botId = bot.body.id as string;

    const ver = await request(app)
      .post(`/api/bots/${botId}/versions`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({})
      .expect(201);
    const versionId = ver.body.id as string;

    // attempt deploy with draft -> 409
    await request(app)
      .post(`/api/bots/${botId}/deploy`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ courseId: course.id })
      .expect(409);

    // publish then deploy
    await request(app)
      .patch(`/api/bot-versions/${versionId}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ status: 'prepared' })
      .expect(200);
    await request(app)
      .patch(`/api/bot-versions/${versionId}`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ status: 'published' })
      .expect(200);

    const dep = await request(app)
      .post(`/api/bots/${botId}/deploy`)
      .set('Authorization', `Bearer ${adminA()}`)
      .send({ courseId: course.id })
      .expect(200);
    expect(dep.body).toMatchObject({ courseId: course.id, botId });

    // Another org creates a bot+instance; list should filter to org A
    await prisma.org.upsert({ where: { id: ORG_B }, create: { id: ORG_B, name: 'Bots Org B' }, update: {} });
    const botB = await prisma.bot.create({ data: { orgId: ORG_B, name: 'B' } });
    const verB = await prisma.botVersion.create({ data: { botId: botB.id, status: 'published' } });
    await prisma.botInstance.create({ data: { courseId: course.id, botId: botB.id, versionId: verB.id } });

    const list = await request(app)
      .get('/api/bot-instances')
      .set('Authorization', `Bearer ${adminA()}`)
      .expect(200);

    const items: Array<{ bot: { name: string } }> = list.body.items;
    expect(items.length).toBe(1);
    expect(items[0].bot.name).toBe('Deployer');
  });
});
