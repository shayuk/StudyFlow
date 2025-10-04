import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ensureCollection, upsertChunks, search, buildOrgFilter } from '../src/services/qdrant';

type MockResponseBody = unknown;
type MockResponse = { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown>; body?: unknown };

function mockFetchOnce(status: number, body: MockResponseBody, ok = status >= 200 && status < 300) {
  (global as unknown as { fetch: unknown }).fetch = vi.fn(async () => ({
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
    body: undefined,
  } satisfies MockResponse)) as unknown as typeof fetch;
}

describe('qdrant service (http stubs)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('ensureCollection: does nothing if collection exists', async () => {
    mockFetchOnce(200, { result: 'ok' }, true);
    await ensureCollection();
    const gf = (globalThis as unknown as { fetch: ReturnType<typeof vi.fn> }).fetch;
    expect(gf).toHaveBeenCalledTimes(1);
  });

  it('ensureCollection: creates when missing', async () => {
    // first GET not ok -> then PUT ok
    (global as unknown as { fetch: unknown }).fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'missing' } satisfies Partial<MockResponse>)
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'created' } satisfies Partial<MockResponse>) as unknown as typeof fetch;
    await ensureCollection();
    const gf = (global as unknown as { fetch: ReturnType<typeof vi.fn> }).fetch;
    expect(gf).toHaveBeenCalledTimes(2);
  });

  it('upsertChunks: throws on failure', async () => {
    mockFetchOnce(500, { error: 'boom' }, false);
    await expect(upsertChunks([{ id: '1', vector: [0, 0, 0], payload: { orgId: 'o1' } }])).rejects.toThrow(/Qdrant upsert failed/);
  });

  it('search: returns result array when ok', async () => {
    mockFetchOnce(200, { result: [{ id: 'x', score: 0.9 }] }, true);
    const out = await search([0, 0, 0], buildOrgFilter('o1'), 3);
    expect(out).toEqual([{ id: 'x', score: 0.9 }]);
  });
});
