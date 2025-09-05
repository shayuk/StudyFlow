import { EMBEDDING_DIM } from './embeddings';

const QDRANT_URL = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
const COLLECTION = process.env.QDRANT_COLLECTION || 'studyflow_chunks';

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export async function ensureCollection(): Promise<void> {
  const url = `${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}`;
  const resp = await fetch(url);
  if (resp.ok) {
    return;
  }
  // create
  const create = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}`, {
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
  const url = `${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}/points?wait=true`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ points }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Qdrant upsert failed: ${resp.status} ${text}`);
  }
}

export interface QdrantResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

export async function search(vector: number[], filter: Record<string, unknown>, limit = 5): Promise<QdrantResult[]> {
  const url = `${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}/points/search`;
  const resp = await fetch(url, {
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
  const data = await resp.json();
  return (data?.result ?? []) as QdrantResult[];
}

export function buildOrgFilter(orgId: string) {
  return {
    must: [
      { key: 'orgId', match: { value: orgId } },
    ],
  };
}
