import fs from 'node:fs/promises';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { prisma } from '../db';
import { Prisma } from '@prisma/client/edge';
import { embedText } from './embeddings';
import { ensureCollection, upsertChunks, search as qdrantSearch, buildOrgFilter } from './qdrant';

// Very simple in-memory queue
const queue: string[] = [];
let running = false;

export async function enqueueProcessDocument(docId: string) {
  queue.push(docId);
  if (!running) void drain();
}

async function drain() {
  running = true;
  while (queue.length) {
    const docId = queue.shift()!;
    try {
      await processDocument(docId);
    } catch (err) {
      // Best-effort logging and status update
      const detail = err instanceof Error ? err.message : String(err);
      try {
        await prisma.knowledgeDocument.update({ where: { id: docId }, data: { status: 'failed', error: detail } });
      } catch { /* ignore */ }
    }
  }
  running = false;
}

async function processDocument(docId: string) {
  const doc = await prisma.knowledgeDocument.findUnique({ where: { id: docId } });
  if (!doc) return;

  await prisma.knowledgeDocument.update({ where: { id: docId }, data: { status: 'processing', error: null } });

  const storageRoot = path.resolve(__dirname, '../../');
  const absPath = path.resolve(storageRoot, doc.path);
  const data = await fs.readFile(absPath);

  let text = '';
  if (doc.mime === 'application/pdf' || doc.filename.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdfParse(data);
    text = parsed.text || '';
  } else {
    // Fallback: treat as text
    text = data.toString('utf8');
  }

  const normalized = normalizeText(text);
  const chunks = chunkText(normalized, 700, 120, 1000); // min 700, overlap 120, max 1000 as safety

  // Persist chunks transactionally: clear old then insert new
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { docId } });
    const rows = chunks.map((c, idx) => ({
      orgId: doc.orgId,
      docId,
      idx,
      content: c,
      meta: null,
    }));
    if (rows.length) {
      // SQLite supports createMany
      await tx.knowledgeChunk.createMany({ data: rows });
    }
    await tx.knowledgeDocument.update({ where: { id: docId }, data: { status: 'ready' } });
  });

  // Best-effort: index into Qdrant if enabled
  if (!process.env.QDRANT_DISABLED) {
    try {
      await ensureCollection();
      const createdChunks = await prisma.knowledgeChunk.findMany({ where: { docId }, orderBy: { idx: 'asc' } });
      const points = createdChunks.map((c) => ({
        id: c.id,
        vector: embedText(c.content),
        payload: {
          orgId: doc.orgId,
          docId: c.docId,
          idx: c.idx,
          content: c.content,
        },
      }));
      await upsertChunks(points);
    } catch {
      // ignore indexing failures in local mode
    }
  }
}

function normalizeText(input: string): string {
  // Basic normalization: trim, collapse whitespace
  return input.replace(/\r\n?/g, '\n').replace(/[\u200f|\u200e]/g, '').replace(/[\t ]+/g, ' ').replace(/\n\s+/g, '\n').trim();
}

function chunkText(s: string, minSize: number, overlap: number, maxSize: number): string[] {
  if (!s) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < s.length) {
    const end = Math.min(i + maxSize, s.length);
    // Prefer to cut at sentence or newline boundaries near minSize..maxSize
    const target = Math.min(i + maxSize, Math.max(i + minSize, i));
    const window = s.slice(i + minSize, end);
    let cut = -1;
    const punct = /[.!?\n]/g;
    let m: RegExpExecArray | null;
    while ((m = punct.exec(window))) {
      const pos = i + minSize + m.index + 1;
      if (pos >= target - 50) { cut = pos; break; }
    }
    if (cut === -1) cut = end;
    const piece = s.slice(i, cut).trim();
    if (piece) chunks.push(piece);
    i = Math.max(cut - overlap, i + 1);
  }
  return chunks;
}

export async function searchKnowledge(params: { orgId: string; query: string; limit?: number }) {
  const { orgId, query, limit = 5 } = params;
  if (!query || !query.trim()) return [] as Array<{ docId: string; idx: number; content: string; score: number }>;

  // If Qdrant is available and not disabled, use vector search
  if (!process.env.QDRANT_DISABLED) {
    try {
      const vector = embedText(query);
      const filter = buildOrgFilter(orgId);
      const hits = await qdrantSearch(vector, filter, limit);
      return hits.map((h) => ({
        docId: String(h.payload?.docId ?? ''),
        idx: Number(h.payload?.idx ?? 0),
        content: String(h.payload?.content ?? ''),
        score: h.score,
      }));
    } catch {
      // fall through to fallback
    }
  }

  // Fallback: naive LIKE search in SQLite (tokenized OR, case-flexible)
  const terms = query
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t && t.length >= 3)
    .slice(0, 5);

  const variants = (t: string) => {
    const lower = t.toLowerCase();
    const upper1 = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    const upper = t.toUpperCase();
    // Deduplicate
    return Array.from(new Set([t, lower, upper1, upper])).filter(Boolean);
  };

  const orClauses = terms.flatMap((t) => variants(t).map((v) => ({ content: { contains: v } })));

  const where = orClauses.length ? { orgId, OR: orClauses } : { orgId, content: { contains: query } };

  const rows = await prisma.knowledgeChunk.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { docId: true, idx: true, content: true },
  });
  if (rows.length > 0) return rows.map((r) => ({ ...r, score: 0.0 }));

  // Last-resort: return most recent chunks from org to provide at least some context
  const fallbackRows = await prisma.knowledgeChunk.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, limit),
    select: { docId: true, idx: true, content: true },
  });
  return fallbackRows.map((r) => ({ ...r, score: 0.0 }));
}

// Fast, safe citations for chat (used by SSE). Guarantees timely return with fallback.
export async function safeCitations(params: { orgId: string; text: string; limit?: number }): Promise<Array<{ docId: string; idx: number; content: string; score: number }>> {
  const { orgId, text, limit = 3 } = params;

  const needFast = process.env.QDRANT_DISABLED === 'true' || process.env.NODE_ENV === 'test';
  if (needFast) {
    // Immediate fallback path which already guarantees last-resort chunks
    return await searchKnowledge({ orgId, query: text, limit });
  }

  // When vector search is enabled, protect with a timeout and fall back to recent chunks
  const op = searchKnowledge({ orgId, query: text, limit });
  const timeoutMs = 5000;
  const timeout = new Promise<Array<{ docId: string; idx: number; content: string; score: number }>>((resolve) => {
    setTimeout(async () => {
      const fallbackRows = await prisma.knowledgeChunk.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: Math.max(1, limit),
        select: { docId: true, idx: true, content: true },
      });
      resolve(fallbackRows.map((r) => ({ ...r, score: 0.0 })));
    }, timeoutMs);
  });

  try {
    const res = await Promise.race([op, timeout]) as Array<{ docId: string; idx: number; content: string; score: number }>;
    if ((res?.length ?? 0) > 0) return res;
    // As a final fallback, return most recent
    const recent = await prisma.knowledgeChunk.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, limit),
      select: { docId: true, idx: true, content: true },
    });
    return recent.map((r) => ({ ...r, score: 0.0 }));
  } catch {
    // On any error, return recent
    const recent = await prisma.knowledgeChunk.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, limit),
      select: { docId: true, idx: true, content: true },
    });
    return recent.map((r) => ({ ...r, score: 0.0 }));
  }
}
