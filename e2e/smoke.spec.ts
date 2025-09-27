import { test, expect } from '@playwright/test';

const BASE_URL = (process.env.BASE_URL || '').trim();

function withAltHost(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      return u.toString();
    }
    if (u.hostname === '127.0.0.1') {
      u.hostname = 'localhost';
      return u.toString();
    }
    return null;
  } catch {
    return null;
  }
}

// Skip the whole file if BASE_URL is not provided (e.g., local CI without staging)
if (!BASE_URL) {
  test.skip(true, 'BASE_URL not set; skipping E2E smoke.');
}

// Basic availability
test('home loads and has a document title', async ({ page }) => {
  let lastErr: unknown = null;
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  } catch (e) {
    lastErr = e;
    const alt = withAltHost(BASE_URL);
    if (!alt) throw e;
    await page.goto(alt, { waitUntil: 'domcontentloaded' });
  }
  const title = await page.title();
  expect(title).toBeTruthy();
});

// Healthcheck endpoint if exposed by frontend or proxy (best-effort; will not fail hard if 404)
test('optional /health endpoint responds (best-effort)', async ({ request }) => {
  let healthUrl: string | null = null;
  try {
    healthUrl = new URL('/health', BASE_URL).toString();
  } catch {
    test.skip(true, 'Invalid BASE_URL; skipping health check.');
  }
  const res = await request.get(healthUrl!);
  // Accept 200/204; otherwise this is optional
  expect([200, 204, 404]).toContain(res.status());
});
