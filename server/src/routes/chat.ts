import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';
import { callStudentModel, callLecturerModel } from '../services/llm';
import { safeCitations } from '../services/knowledge';
import { openSSE, sseError } from '../utils/sse';
import { logger } from '../logger';
import { isLecturerRole, normalizeRole } from '../utils/roles';

const router = Router();

// Start a new conversation scoped to org and bot instance
router.post(
  '/chat/start',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const userId = req.user!.sub;
    const role = req.user!.roles[0] ?? 'student';
    const userKind = normalizeRole(role);

    const { botInstanceId, pageId, courseId } = (req.body ?? {}) as {
      botInstanceId?: string;
      pageId?: string;
      courseId?: string;
    };

    if (!botInstanceId || typeof botInstanceId !== 'string') {
      return res.status(400).json({ error: 'botInstanceId is required (string)' });
    }

    const inst = await prisma.botInstance.findUnique({
      where: { id: botInstanceId },
      include: { bot: true },
    });
    if (!inst) return res.status(404).json({ error: 'bot instance not found' });
    if (inst.bot.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: instance not in your org' });

    const convo = await prisma.conversation.create({
      data: {
        orgId,
        botInstanceId,
        userId,
        role,
        pageId,
        courseId,
      },
      select: { id: true, orgId: true, botInstanceId: true, userId: true, role: true, pageId: true, courseId: true, createdAt: true },
    });
    return res.status(201).json(convo);
  }
);

// Post a user message, persist, and create a stub bot reply (SSE stubbed by immediate reply persistence)
router.post(
  '/chat/:conversationId/message',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const { conversationId } = req.params as { conversationId: string };
    const { content } = (req.body ?? {}) as { content?: string };

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required (string)' });
    }

    const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo) return res.status(404).json({ error: 'conversation not found' });
    if (convo.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: conversation not in your org' });

    // Always persist the user message first
    const userMsg = await prisma.message.create({
      data: {
        conversationId,
        sender: 'user',
        content,
        citations: '[]',
      },
      select: { id: true, sender: true, content: true, createdAt: true },
    });

    let citationsJson = '[]';

    // ── Shared selection context (scope-wide) ─────────────────────────────
    const role = req.user!.roles[0] ?? 'student';
    const userKind = normalizeRole(role);
    const reqId = (res.locals as any).reqId;
    const requestedProvider =
      (req.body as any)?.provider || (req.query as any)?.provider || null;
    const studentModel = process.env.STUDENT_MODEL || 'gpt-4o-mini';
    const lecturerModel = process.env.LECTURER_MODEL || 'claude-3-haiku-20240307';
    const finalProvider =
      userKind === 'lecturer'
        ? (process.env.LECTURER_PROVIDER === 'openai' ? 'openai' : 'anthropic')
        : 'openai';
    const model = finalProvider === 'anthropic' ? lecturerModel : studentModel;
    logger.info(
      { tag: 'LOG#2', reqId, role, userKind, requestedProvider, finalProvider, model },
      'LLM selection'
    );

    // Streaming toggle: Accept: text/event-stream or ?stream=1
    const wantsStream =
      (req.header('accept')?.includes('text/event-stream') ?? false) || (req.query?.stream === '1');

    const context = { pageId: convo.pageId ?? undefined, courseId: convo.courseId ?? undefined };

    if (wantsStream) {
      const sse = openSSE(req, res);

      let full = '';
      let botSavedId: string | undefined;
      const isTest = process.env.NODE_ENV === 'test';

      // TEST-ONLY: safety fuse to force-close if something stalls
      const isTestEnv = process.env.NODE_ENV === 'test';
      const safetyMs = 12000;
      const enableSafetyFuse = process.env.SSE_SAFETY_FUSE === '1';
      const safetyKill = (isTestEnv && enableSafetyFuse) ? setTimeout(() => {
        try { sse.write('delta', { __probe: 'safety_timeout' }); } catch { /* ignore */ }
        try { sse.write('done', { done: true, messageId: null, citations: [] }); } catch { /* ignore */ }
        try { sse.end(); } catch { /* ignore */ }
        try { res.socket?.end?.(); } catch { /* ignore */ }
        try { res.socket?.destroy?.(); } catch { /* ignore */ }
      }, safetyMs) : null;

      try {
        // TODO: Test-mode fallback: emits echo content instead of calling real LLM. Ensure tests explicitly set NODE_ENV=test and that prod never hits this path.
        if (isTest) {
          // Deterministic single-chunk content in tests
          full = `(DEV fallback) ${content}`;
          sse.write('delta', { t: full });
        } else {
          // LOG#3 – before call (stream)
          logger.info({ tag: 'LOG#3', reqId, provider: finalProvider, model, stream: true }, 'LLM call (before)');
          // Select model by role
          const stream = (userKind === 'lecturer')
            ? await callLecturerModel({ text: content, context })
            : await callStudentModel({ text: content, context });
          // Accumulate full bot text while streaming chunks
          for await (const chunk of stream) {
            full += chunk;
            sse.write('delta', { t: chunk });
          }
        }

        // Compute citations from the final full text using safe helper
        const cites = await safeCitations({ orgId, text: full || content, limit: 3 });
        citationsJson = JSON.stringify(
          cites.map((c) => ({ docId: c.docId, idx: c.idx, snippet: c.content.slice(0, 300), score: c.score }))
        );

        // Persist bot message as a single record
        const botSaved = await prisma.message.create({
          data: {
            conversationId,
            sender: 'bot',
            content: full || `Bot: ${content}`,
            citations: citationsJson,
          },
          select: { id: true, sender: true, content: true, createdAt: true },
        });
        botSavedId = botSaved.id;

        // Final event with metadata
        sse.write('done', { done: true, messageId: botSaved.id, citations: JSON.parse(citationsJson) });
      } catch (e) {
        sseError(res, (e as any)?.message || 'Chat streaming failed');
      } finally {
        try { if (safetyKill) clearTimeout(safetyKill); } catch { /* ignore */ }
        // TODO: Test-only socket teardown: ensure this only runs in tests to avoid prematurely closing client connections in dev/prod.
        // Always end SSE in tests; in prod, client will close when done
        try { sse.end(); } catch { /* ignore */ }
        if (process.env.NODE_ENV === 'test') {
          try { res.socket?.end?.(); } catch { /* ignore */ }
          try { res.socket?.destroy?.(); } catch { /* ignore */ }
        }
      }
      return;
    }

    // Non-stream: perform real LLM call by aggregating streaming chunks
    // LOG#3 – before call (non-stream)
    logger.info({ tag: 'LOG#3', reqId, provider: finalProvider, model, stream: false }, 'LLM call (before)');

    try {
      const stream = (finalProvider === 'anthropic' && userKind === 'lecturer')
        ? await callLecturerModel({ text: content, context })
        : await callStudentModel({ text: content, context });
      let full = '';
      for await (const chunk of stream) full += chunk;

      // Compute citations on full bot text
      const cites = await safeCitations({ orgId, text: full || content, limit: 3 });
      citationsJson = JSON.stringify(
        cites.map((c) => ({ docId: c.docId, idx: c.idx, snippet: c.content.slice(0, 300), score: c.score }))
      );

      // Persist bot message
      const botMsg = await prisma.message.create({
        data: {
          conversationId,
          sender: 'bot',
          content: full,
          citations: citationsJson,
        },
        select: { id: true, sender: true, content: true, createdAt: true },
      });

      return res.status(200).json({ message: botMsg, provider: finalProvider, model });
    } catch (e) {
      // LOG#4 – provider error / LOG#5 – fallback decision
      logger.warn({ tag: 'LOG#4', reqId, provider: finalProvider, model, error: String(e) }, 'LLM provider error (non-stream)');
      logger.warn({ tag: 'LOG#5', reqId, reason: 'exception', provider: finalProvider }, 'FALLBACK (blocked): returning 503');
      return res.status(503).json({ code: 'LLM_UNAVAILABLE', message: 'שירות ה-AI אינו זמין. נסו שוב מאוחר יותר.' });
    }
  }
);

// List messages
router.get(
  '/chat/:conversationId/messages',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['student', 'instructor', 'admin']),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const { conversationId } = req.params as { conversationId: string };

    const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo) return res.status(404).json({ error: 'conversation not found' });
    if (convo.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: conversation not in your org' });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, sender: true, content: true, createdAt: true, citations: true },
    });
    return res.status(200).json({ items: messages });
  }
);

export default router;
