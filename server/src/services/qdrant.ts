// server/src/services/qdrant.ts
// גרסה מינימלית תואמת-קוד קיים + תמיכה ב-QDRANT_API_KEY לכל בקשה

import { EMBEDDING_DIM } from './embeddings';

const QDRANT_URL = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/+$/, '');
const COLLECTION = process.env.QDRANT_COLLECTION || 'studyflow_chunks';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || ''; // NEW: מפתח ל-Qdrant Cloud

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

// עטיפת fetch שמזריקה כותרת api-key אוטומטית ושומרת על שאר ההגדרות
function qdrantFetch(path: string, init: RequestInit = {}) {
  // נבנה אובייקט כותרות פשוט כדי להימנע מסוגי DOM כמו Headers/HeadersInit
  const outHeaders: Record<string, string> = {};
  const src = init.headers as unknown;
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
      outHeaders[String(k)] = String(v as unknown as string);
    }
  }

  // הזרקת api-key אם מוגדר
  if (QDRANT_API_KEY) {
    outHeaders['api-key'] = QDRANT_API_KEY;
    // לחלופין:
    // outHeaders['Authorization'] = `Bearer ${QDRANT_API_KEY}`;
  }

  return fetch(`${QDRANT_URL}${path}`, { ...init, headers: outHeaders });
}

export async function ensureCollection(): Promise<void> {
  const path = `/collections/${encodeURIComponent(COLLECTION)}`;
  const resp = await qdrantFetch(path); // GET
  if (resp.ok) return;

  // create if not exists
  const create = await qdrantFetch(path, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: EMBEDDING_DIM,
        distance: 'Cosine',
      },
    }),
  });
  if (!create.ok) {
    const text = await create.text().catch(() => '');
    throw new Error(`Qdrant create collection failed: ${create.status} ${text}`);
  }
}

export async function upsertChunks(points: QdrantPoint[]): Promise<void> {
  if (!points.length) return;
  const path = `/collections/${encodeURIComponent(COLLECTION)}/points?wait=true`;
  const resp = await qdrantFetch(path, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ points }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Qdrant upsert failed: ${resp.status} ${text}`);
  }
}

export async function search(
  vector: number[],
  filter: Record<string, unknown>,
  limit = 5
): Promise<QdrantResult[]> {
  const path = `/collections/${encodeURIComponent(COLLECTION)}/points/search`;
  const resp = await qdrantFetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit,
      filter,
      with_payload: true,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Qdrant search failed: ${resp.status} ${text}`);
  }
  interface QdrantSearchResponse { result?: QdrantResult[] }
  const data = (await resp.json()) as QdrantSearchResponse;
  return Array.isArray(data.result) ? data.result : [];
}

export function buildOrgFilter(orgId: string) {
  return {
    must: [{ key: 'orgId', match: { value: orgId } }],
  };
}
