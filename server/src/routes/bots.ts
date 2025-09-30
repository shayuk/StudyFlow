import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';
import { z } from 'zod';
import { logger } from '../logger';

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
  const schema = z.object({
    name: z.string().min(1, 'name is required (string)'),
    persona: z.any().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid body' });
  }
  const { name, persona } = parsed.data as { name: string; persona?: unknown };
  try {
    const created = await prisma.bot.create({ data: { orgId, name, persona: toJSONString(persona) } });
    logger.info({ orgId, botId: created.id, route: 'POST /api/bots' }, 'Bot created');
    return res.status(201).json({ id: created.id, name: created.name, persona: created.persona });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn({ orgId, err: detail, route: 'POST /api/bots' }, 'Create bot failed');
    return res.status(409).json({ error: 'create bot failed', detail });
  }
});

// Create a bot version under a bot (instructor/admin)
router.post('/bots/:botId/versions', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { botId } = req.params as { botId: string };
  const schema = z.object({
    prompts: z.any().optional(),
    tools: z.any().optional(),
    temperature: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid body' });
  }
  const { prompts, tools, temperature } = parsed.data as { prompts?: unknown; tools?: unknown; temperature?: number };

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
  logger.info({ orgId, botId, versionId: created.id, route: 'POST /api/bots/:botId/versions' }, 'Bot version created');
  return res.status(201).json(created);
});

// Update bot version (lifecycle + editable fields). Only forward transitions allowed: draft->prepared->published
router.patch('/bot-versions/:versionId', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { versionId } = req.params as { versionId: string };
  const schema = z.object({
    status: z.enum(['draft', 'prepared', 'published', 'retired']).optional(),
    prompts: z.any().optional(),
    tools: z.any().optional(),
    temperature: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid body' });
  }
  const { status, prompts, tools, temperature } = parsed.data as { status?: string; prompts?: unknown; tools?: unknown; temperature?: number };

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
  logger.info({ orgId, versionId: updated.id, status: updated.status, route: 'PATCH /api/bot-versions/:versionId' }, 'Bot version updated');
  return res.status(200).json(updated);
});

// Deploy a bot to a course with a specific published version (instructor/admin)
router.post('/bots/:botId/deploy', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { botId } = req.params as { botId: string };
  const schema = z.object({
    courseId: z.string().min(1, 'courseId is required (string)'),
    versionId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid body' });
  }
  const { courseId, versionId } = parsed.data as { courseId: string; versionId?: string };

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
    logger.info({ orgId, botId, courseId, versionId: version.id, route: 'POST /api/bots/:botId/deploy' }, 'Bot deployed to course');
    return res.status(200).json(inst);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn({ orgId, botId, courseId, err: detail, route: 'POST /api/bots/:botId/deploy' }, 'Bot deploy failed');
    return res.status(409).json({ error: 'deploy failed', detail });
  }
});

// List bot instances (filter by courseId)
router.get('/bot-instances', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { courseId } = req.query as { courseId?: string };

  const where: any = {
    ...(courseId ? { courseId } : {}),
    // ensure related records exist and restrict to caller org
    bot: { is: { orgId } },
    version: { is: {} },
  };

  const instances = await prisma.botInstance.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      bot: { select: { id: true, name: true, orgId: true } },
      version: { select: { id: true, status: true } },
    },
  });

  return res.status(200).json({ items: instances.map((i) => ({
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
