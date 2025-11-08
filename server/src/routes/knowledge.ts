import { Router, Response } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { authMiddleware, AuthedRequest } from '../auth/middleware';
import { requireAnyRole, requireOrg } from '../auth/authorize';
import { prisma } from '../db';
import { enqueueProcessDocument, searchKnowledge } from '../services/knowledge';

const router = Router();

// Ensure storage dir exists at runtime
const STORAGE_DIR = path.resolve(__dirname, '../../storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, STORAGE_DIR),
    filename: (_req, file, cb) => {
      const safeBase = path.basename(file.originalname).replace(/[^\w.-]/g, '_');
      const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      cb(null, `${unique}__${safeBase}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Create a knowledge source
router.post('/knowledge/sources', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { name, meta } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required (string)' });
  }
  try {
    const created = await prisma.knowledgeSource.create({
      data: { orgId, name, meta: typeof meta === 'string' ? meta : undefined },
      select: { id: true, name: true, meta: true, createdAt: true },
    });
    return res.status(201).json(created);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(409).json({ error: 'create source failed', detail });
  }
});

// Upload a document (multipart)
router.post(
  '/knowledge/documents',
  authMiddleware,
  requireOrg(),
  requireAnyRole(['instructor', 'admin']),
  upload.single('file'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.user!.orgId;
    const { sourceId } = req.body as { sourceId?: string };
    if (!sourceId) return res.status(400).json({ error: 'sourceId is required' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'file is required (multipart field "file")' });

    // Validate source belongs to org
    const source = await prisma.knowledgeSource.findUnique({ where: { id: sourceId } });
    if (!source) return res.status(404).json({ error: 'source not found' });
    // Note: source has orgId column; ensure it matches
    if (source.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: source not in your org' });

    try {
      const created = await prisma.knowledgeDocument.create({
        data: {
          orgId,
          sourceId,
          filename: file.originalname,
          mime: file.mimetype,
          size: file.size,
          path: path.relative(path.resolve(__dirname, '../../'), file.path).replace(/\\/g, '/'),
          status: 'uploaded',
        },
        select: { id: true, filename: true, mime: true, size: true, status: true, createdAt: true },
      });

      // Enqueue processing
      enqueueProcessDocument(created.id).catch(() => void 0);

      return res.status(201).json(created);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      return res.status(409).json({ error: 'upload failed', detail });
    }
  }
);

// Fetch a document status with chunk count
router.get('/knowledge/documents/:id', authMiddleware, requireOrg(), requireAnyRole(['instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const { id } = req.params as { id: string };

  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id },
    include: { _count: { select: { chunks: true } } },
  });
  if (!doc) return res.status(404).json({ error: 'document not found' });
  if (doc.orgId !== orgId) return res.status(403).json({ error: 'Forbidden: document not in your org' });

  return res.status(200).json({
    id: doc.id,
    filename: doc.filename,
    mime: doc.mime,
    size: doc.size,
    status: doc.status,
    error: doc.error,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    chunks: doc._count?.chunks ?? 0,
  });
});

// Search knowledge (hybrid: vector via Qdrant if available; fallback LIKE)
router.get('/knowledge/search', authMiddleware, requireOrg(), requireAnyRole(['student', 'instructor', 'admin']), async (req: AuthedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const q = String((req.query?.q ?? '') as string);
  const limit = Number((req.query?.limit ?? 5) as string) || 5;

  const items = await searchKnowledge({ orgId, query: q, limit });
  return res.status(200).json({ items });
});

export default router;
