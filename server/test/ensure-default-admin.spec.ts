import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks to avoid initialization order issues
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    org: { findFirst: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../src/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../src/db', () => ({ prisma: mockPrisma }));

// Helper to import module with a specific config per test
async function importWithConfig(email: string | undefined) {
  vi.resetModules();
  vi.doMock('../src/config', () => ({ DEFAULT_ADMIN_EMAIL: email }));
  const mod = await import('../src/bootstrap/ensureDefaultAdmin');
  return mod.ensureDefaultAdmin;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ensureDefaultAdmin()', () => {
  it('skips when DEFAULT_ADMIN_EMAIL is missing', async () => {
    const run = await importWithConfig(undefined);
    await run();

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('creates org if none and creates admin user when not exists', async () => {
    const run = await importWithConfig('admin@example.com');
    mockPrisma.org.findFirst.mockResolvedValueOnce(null);
    mockPrisma.org.create.mockResolvedValueOnce({ id: 'org1', name: 'Default Org' });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({ id: 'u1' });

    await run();

    expect(mockPrisma.org.create).toHaveBeenCalled();
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ orgId: 'org1', email: 'admin@example.com' }),
    });
  });

  it('promotes existing non-admin to admin', async () => {
    const run = await importWithConfig('admin@example.com');
    mockPrisma.org.findFirst.mockResolvedValueOnce({ id: 'orgA', name: 'A' });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u2', email: 'admin@example.com', role: 'student' });
    mockPrisma.user.update.mockResolvedValueOnce({ id: 'u2', role: 'admin' });

    await run();

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: expect.objectContaining({ role: 'admin' }),
    });
  });

  it('does nothing when admin already present', async () => {
    const run = await importWithConfig('admin@example.com');
    mockPrisma.org.findFirst.mockResolvedValueOnce({ id: 'orgA', name: 'A' });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u3', email: 'admin@example.com', role: 'admin' });

    await run();

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
