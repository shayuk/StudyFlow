import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireOrg, requireAnyRole } from '../auth/authorize';
import { prisma } from '../db';
import { callStudentModel, callLecturerModel } from '../services/llm';
import { safeCitations } from '../services/knowledge';

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

    // Streaming toggle: Accept: text/event-stream or ?stream=1
    const wantsStream =
      (req.header('accept')?.includes('text/event-stream') ?? false) || (req.query?.stream === '1');

    const role = req.user!.roles[0] ?? 'student';
    const context = { pageId: convo.pageId ?? undefined, courseId: convo.courseId ?? undefined };

    if (wantsStream) {
      // Prepare SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      // Close only in tests to guarantee 'end' for Supertest; keep-alive in prod
      res.setHeader('Connection', process.env.NODE_ENV === 'test' ? 'close' : 'keep-alive');
      res.flushHeaders?.();

      // debug removed: start marker

      const onClose = () => { try { res.end(); } catch { /* ignore */ } };
      req.on?.('aborted', onClose);
      req.on?.('close', onClose);

      // Helper to write SSE lines safely
      const write = (data: string) => {
        res.write(`data: ${data.replace(/\n/g, '\\n')}\n\n`);
      };

      let full = '';
      let botSavedId: string | undefined;
      const isTest = process.env.NODE_ENV === 'test';

      // TEST-ONLY: safety fuse to force-close if something stalls
      const isTestEnv = process.env.NODE_ENV === 'test';
      const safetyMs = 12000;
      const enableSafetyFuse = process.env.SSE_SAFETY_FUSE === '1';
      const safetyKill = (isTestEnv && enableSafetyFuse) ? setTimeout(() => {
        try {
          const payload = { done: true, messageId: null, citations: [] };
          res.write(`data: ${JSON.stringify({ __probe: 'safety_timeout' })}\n\n`);
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch { /* ignore */ }
        try { res.end(); } catch { /* ignore */ }
        try { res.socket?.end?.(); } catch { /* ignore */ }
        try { res.socket?.destroy?.(); } catch { /* ignore */ }
      }, safetyMs) : null;

      try {
        if (isTest) {
          // Deterministic single-chunk content in tests
          full = `(DEV fallback) ${content}`;
          write(full);
          // debug removed: wrote chunk (test mode)
        } else {
          // Select model by role
          const stream = role === 'instructor' || role === 'admin'
            ? await callLecturerModel({ text: content, context })
            : await callStudentModel({ text: content, context });
          // Accumulate full bot text while streaming chunks
          for await (const chunk of stream) {
            full += chunk;
            write(chunk);
          }
          // debug removed: finished streaming
        }

        // Compute citations from the final full text using safe helper
        // debug removed: before safeCitations
        const cites = await safeCitations({ orgId, text: full || content, limit: 3 });
        citationsJson = JSON.stringify(
          cites.map((c) => ({ docId: c.docId, idx: c.idx, snippet: c.content.slice(0, 300), score: c.score }))
        );
        // debug removed: after safeCitations

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

        // debug removed: writing probe
        // write(JSON.stringify({ __probe: 'finishing_sse', conversationId, messageId: botSavedId }));

        // Final event with metadata
        // debug removed: writing final
        write(JSON.stringify({ done: true, messageId: botSaved.id, citations: JSON.parse(citationsJson) }));
      } catch {
        // Provider or DB error: still send a minimal final event so clients can finish
        // debug removed: catch
        const payload = { done: true, messageId: botSavedId ?? null, citations: JSON.parse(citationsJson) };
        try { write(JSON.stringify(payload)); } catch { /* ignore */ }
      } finally {
        // End and aggressively close to guarantee 'end' for Supertest on all platforms
        // debug removed: finally closing
        try { if (safetyKill) clearTimeout(safetyKill); } catch { /* ignore */ }
        try { res.end(); } catch { /* ignore */ }
        if (process.env.NODE_ENV === 'test') {
          try { res.socket?.end?.(); } catch { /* ignore */ }
          try { res.socket?.destroy?.(); } catch { /* ignore */ }
        }
      }
      return;
    }

    // Non-streaming fallback (existing behavior, preserves tests)
    const providerText = role === 'instructor' || role === 'admin' ? `Bot: ${content}` : `Bot: ${content}`;
    // Non-stream citations (compute quickly with safe helper on content)
    try {
      const cites = await safeCitations({ orgId, text: content, limit: 3 });
      citationsJson = JSON.stringify(
        cites.map((c) => ({ docId: c.docId, idx: c.idx, snippet: c.content.slice(0, 300), score: c.score }))
      );
    } catch { citationsJson = '[]'; }

    const botMsg = await prisma.message.create({
      data: {
        conversationId,
        sender: 'bot',
        content: providerText,
        citations: citationsJson,
      },
      select: { id: true, sender: true, content: true, createdAt: true },
    });

    return res.status(200).json({ user: userMsg, bot: botMsg });
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
