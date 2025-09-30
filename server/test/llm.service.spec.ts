import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { callStudentModel, callLecturerModel, type TextStream } from '../src/services/llm';

async function collect(stream: TextStream): Promise<string> {
  let out = '';
  for await (const chunk of stream) out += chunk;
  return out;
}

describe('llm service (dev/test fallbacks)', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.LECTURER_PROVIDER;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('callStudentModel returns DEV fallback stream in test env', async () => {
    const s = await callStudentModel({ text: 'hello' });
    const text = await collect(s);
    expect(text).toContain('(DEV fallback) hello');
  });

  it('callLecturerModel returns DEV fallback stream in test env (no keys)', async () => {
    const s = await callLecturerModel({ text: 'teach', highGear: false });
    const text = await collect(s);
    expect(text).toContain('(DEV fallback) teach');
  });

  it('callLecturerModel with provider override to openai delegates to student model (still fallback in test)', async () => {
    process.env.LECTURER_PROVIDER = 'openai';
    const s = await callLecturerModel({ text: 'route', highGear: true });
    const text = await collect(s);
    expect(text).toContain('(DEV fallback) route');
  });
});
