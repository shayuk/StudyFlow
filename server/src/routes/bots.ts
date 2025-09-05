import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';

const router = Router();

function toJSONString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

// List bots within org
router.get('/bots', authMiddleware, requireOrg(), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const bots = await prisma.bot.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, persona: true, createdAt: true, updatedAt: true },
  });
  return res.status(200).json({ items: bots });
});

// Create bot (instructor/admin)
router.post('/bots', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { name, persona } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required (string)' });
  }
  try {
    const created = await prisma.bot.create({ data: { orgId, name, persona } });
    return res.status(201).json({ id: created.id, name: created.name, persona: created.persona });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(409).json({ error: 'create bot failed', detail });
  }
});

// Create a bot version under a bot (instructor/admin)
router.post('/bots/:botId/versions', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { botId } = req.params as { botId: string };
  const { prompts, tools, temperature } = req.body ?? {};

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) return res.status(404).json({ error: 'bot not found' });
  if (bot.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: bot not in your org' });

  const created = await prisma.botVersion.create({
    data: {
      botId,
      status: 'draft',
      prompts: toJSONString(prompts),
      tools: toJSONString(tools),
      temperature: typeof temperature === 'number' ? temperature : undefined,
    },
    select: { id: true, status: true, prompts: true, tools: true, temperature: true, createdAt: true },
  });
  return res.status(201).json(created);
});

// Update bot version (lifecycle + editable fields). Only forward transitions allowed: draft->prepared->published
router.patch('/bot-versions/:versionId', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { versionId } = req.params as { versionId: string };
  const { status, prompts, tools, temperature } = req.body ?? {};

  const ver = await prisma.botVersion.findUnique({
    where: { id: versionId },
    include: { bot: true },
  });
  if (!ver) return res.status(404).json({ error: 'version not found' });
  if (ver.bot.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: version not in your org' });

  // lifecycle enforcement
  const order = ['draft', 'prepared', 'published', 'retired'] as const;
  const curIdx = order.indexOf(ver.status as (typeof order)[number]);
  const nextIdx = status ? order.indexOf(String(status) as (typeof order)[number]) : curIdx;
  if (status !== undefined) {
    if (nextIdx === -1) return res.status(400).json({ error: 'invalid status value' });
    // Only allow moving to the immediate next state
    if (!(nextIdx === curIdx || nextIdx === curIdx + 1)) {
      return res.status(409).json({ error: 'invalid lifecycle transition' });
    }
  }

  const updated = await prisma.botVersion.update({
    where: { id: versionId },
    data: {
      ...(status !== undefined ? { status: String(status) } : {}),
      ...(prompts !== undefined ? { prompts: toJSONString(prompts) } : {}),
      ...(tools !== undefined ? { tools: toJSONString(tools) } : {}),
      ...(temperature !== undefined && typeof temperature === 'number' ? { temperature } : {}),
    },
    select: { id: true, status: true, prompts: true, tools: true, temperature: true, updatedAt: true },
  });
  return res.status(200).json(updated);
});

// Deploy a bot to a course with a specific published version (instructor/admin)
router.post('/bots/:botId/deploy', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { botId } = req.params as { botId: string };
  const { courseId, versionId } = req.body ?? {} as { courseId?: string; versionId?: string };

  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({ error: 'courseId is required (string)' });
  }

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) return res.status(404).json({ error: 'bot not found' });
  if (bot.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: bot not in your org' });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'course not found' });
  if (course.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: course not in your org' });

  let version: { id: string; status: string } | null = null;
  if (versionId) {
    version = await prisma.botVersion.findUnique({ where: { id: versionId }, select: { id: true, status: true } });
    if (!version) return res.status(404).json({ error: 'version not found' });
  } else {
    // pick latest published version
    version = await prisma.botVersion.findFirst({
      where: { botId, status: 'published' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });
  }
  if (!version) return res.status(409).json({ error: 'no published version available' });
  if (version.status !== 'published') return res.status(409).json({ error: 'cannot deploy a non-published version' });

  try {
    const inst = await prisma.botInstance.upsert({
      where: { courseId_botId: { courseId, botId } },
      create: { courseId, botId, versionId: version.id },
      update: { versionId: version.id },
      select: { id: true, courseId: true, botId: true, versionId: true, createdAt: true },
    });
    return res.status(200).json(inst);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(409).json({ error: 'deploy failed', detail });
  }
});

// List bot instances (filter by courseId)
router.get('/bot-instances', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { courseId } = req.query as { courseId?: string };

  const where: { courseId?: string } = {};
  if (courseId) where.courseId = courseId;

  const instances = await prisma.botInstance.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { bot: true, version: true },
  });

  // filter by org (via bot.orgId)
  const filtered = instances.filter((i) => i.bot.orgId === orgId);
  return res.status(200).json({ items: filtered.map((i) => ({
    id: i.id,
    courseId: i.courseId,
    botId: i.botId,
    versionId: i.versionId,
    createdAt: i.createdAt,
    bot: { id: i.bot.id, name: i.bot.name },
    version: { id: i.version.id, status: i.version.status },
  })) });
});

export default router;
