// Minimal typed interface to return async chunks for SSE
export type TextStream = AsyncIterable<string>;

function stringToStream(text: string): TextStream {
  async function* gen() {
    yield text;
  }
  return gen();
}

// In dev without keys, fall back to echo
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const isTest = process.env.NODE_ENV === 'test';

export interface LlmContext {
  pageId?: string;
  courseId?: string;
  extra?: Record<string, unknown>;
}

export async function callStudentModel(params: { text: string; context?: LlmContext }): Promise<TextStream> {
  const { text } = params;
  // TODO: Test/dev fallback path: returns echo instead of real OpenAI call when NODE_ENV=test or OPENAI_API_KEY is missing. Replace with a test stub only in tests; in dev, consider surfacing a clear error.
  if (isTest || !hasOpenAI) {
    // LOG#5 – fallback
    const reason = isTest ? 'test-mode' : 'no-key';
    logger.warn({ tag: 'LOG#5', reason, provider: 'openai' }, 'FALLBACK: using echo for student model');
    return stringToStream(`(DEV fallback) ${text}`);
  }
  // OpenAI Responses API (stream mode)
  type FetchResponse = {
    ok: boolean;
    status?: number;
    statusText?: string;
    body: ReadableStream<Uint8Array> | null;
    text?: () => Promise<string>;
  };
  // LOG#3 – before call
  logger.info({ tag: 'LOG#3', provider: 'openai', model: 'gpt-4o-mini', stream: true }, 'LLM call (before)');
  const resp = (await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: 'You are a helpful assistant for students.' },
        { role: 'user', content: text },
      ],
    }),
  })) as unknown as FetchResponse;
  // TODO: Error fallback: missing body or non-OK response. Add logging with status/body and surface a metric; avoid silent fallback masking outages.
  if (!resp.ok || !resp.body) {
    // LOG#4 – provider error
    const body = await safeReadText(resp);
    logger.warn({ tag: 'LOG#4', provider: 'openai', status: resp.status, statusText: resp.statusText, body }, 'LLM provider error (student)');
    // LOG#5 – fallback
    logger.warn({ tag: 'LOG#5', reason: 'upstream-error', provider: 'openai' }, 'FALLBACK: student echo after error');
    return stringToStream(`(LLM error fallback) ${text}`);
  }
  const reader = (resp.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  async function* stream() {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  }
  return stream();
}

import { logger } from '../logger';
// LOG#1 – key load
logger.info({ tag: 'LOG#1', hasOpenAI, hasAnthropic, NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL === '1' }, 'LLM keys and environment loaded');

// Safely read response body for diagnostics
type TextReadable = { text?: () => Promise<string> };
async function safeReadText(resp?: TextReadable): Promise<string> {
  try { return resp?.text ? await resp.text() : '<no body>'; } catch { return '<unreadable body>'; }
}

export async function callLecturerModel(params: { text: string; context?: LlmContext; highGear?: boolean }): Promise<TextStream> {
  const { text, highGear } = params;
  // TODO: Test/dev fallback path: returns echo when NODE_ENV=test or ANTHROPIC_API_KEY is missing. Ensure prod fails fast or glides to OpenAI, not echo.
  if (isTest || !hasAnthropic) {
    // LOG#5 – fallback
    const reason = isTest ? 'test-mode' : 'no-key';
    logger.warn({ tag: 'LOG#5', reason, provider: 'anthropic' }, 'FALLBACK: using echo for lecturer model');
    return stringToStream(`(DEV fallback) ${text}`);
  }
  // Using Anthropic messages API with streaming SSE
  const model = highGear ? 'claude-3-opus-20240229' : 'claude-3-haiku-20240307';

  // Optional manual provider override for testing
  const force = process.env.LECTURER_PROVIDER; // 'anthropic' | 'openai' | undefined
  if (force === 'openai' && hasOpenAI) {
    logger.info({ provider: 'openai', model: 'gpt-4o-mini' }, 'Lecturer override: forcing OpenAI');
    return callStudentModel({ text, context: params.context });
  }
  const allowGlide = force !== 'anthropic';
  // Simple retry/backoff (3 attempts: 0ms, 300ms, 600ms) before gliding
  const attempts = 3;
  const baseDelayMs = 300;
  for (let i = 0; i < attempts; i++) {
    try {
      // LOG#3 – before call
      logger.info({ tag: 'LOG#3', provider: 'anthropic', model, stream: true, attempt: i + 1 }, 'LLM call (before)');
      const resp = (await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY as string,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          stream: true,
          messages: [
            { role: 'user', content: text },
          ],
        }),
      })) as unknown as { ok: boolean; status: number; statusText?: string; body: ReadableStream<Uint8Array> | null; text?: () => Promise<string> };
      if (!resp.ok || !resp.body) {
        // Retry only on transient errors (429 / 5xx). Otherwise break to glide/fallback.
        const transient = resp.status === 429 || (resp.status >= 500 && resp.status <= 599);
        if (transient && i < attempts - 1) {
          await new Promise((r) => setTimeout(r, baseDelayMs * i));
          continue;
        }
        const bodyText = await safeReadText(resp);
        // LOG#4 – provider error
        logger.warn({ tag: 'LOG#4', provider: 'anthropic', status: resp.status, statusText: resp.statusText, body: bodyText }, 'LLM provider error (lecturer)');
        logger.warn({ provider: 'openai_glide', status: resp.status, statusText: resp.statusText, model, body: bodyText }, 'Gliding to OpenAI from Anthropic failure');
        if (allowGlide && hasOpenAI) {
          // LOG#5 – fallback (glide)
          logger.warn({ tag: 'LOG#5', reason: 'glide', provider: 'openai' }, 'FALLBACK: gliding to OpenAI');
          try { return await callStudentModel({ text, context: params.context }); }
          catch (e) { logger.warn({ provider: 'openai_glide', error: String(e), model }, 'OpenAI glide failed'); }
        }
        // TODO: Final fallback to echo after provider failures. Consider surfacing a user-visible error and logging a metric instead of echo response.
        logger.warn({ tag: 'LOG#5', reason: 'upstream-error', provider: 'anthropic' }, 'FALLBACK: lecturer echo after error');
        return stringToStream(`(LLM error fallback) ${text}`);
      }
      const reader = (resp.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      logger.info({ provider: 'anthropic', model }, 'Lecturer stream: Anthropic OK');
      async function* stream() {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          yield chunk;
        }
      }
      return stream();
    } catch (err: unknown) {
      // Retry on network exceptions too
      const detail = err instanceof Error ? err.message : String(err);
      const lastAttempt = i >= attempts - 1;
      if (!lastAttempt) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
        continue;
      }
      // LOG#4 – provider error (exception)
      logger.warn({ tag: 'LOG#4', provider: 'anthropic', error: detail, model }, 'LLM provider exception (lecturer)');
      logger.warn({ provider: 'openai_glide', error: detail, model }, 'Gliding to OpenAI from Anthropic exception');
      if (allowGlide && hasOpenAI) {
        // LOG#5 – fallback (glide)
        logger.warn({ tag: 'LOG#5', reason: 'glide', provider: 'openai' }, 'FALLBACK: gliding to OpenAI');
        try { return await callStudentModel({ text, context: params.context }); }
        catch (e) { logger.warn({ provider: 'openai_glide', error: String(e), model }, 'OpenAI glide failed'); }
      }
      // TODO: Final fallback on exception: returns echo. Prefer explicit error to client and metric for alerting.
      logger.warn({ tag: 'LOG#5', reason: 'exception', provider: 'anthropic' }, 'FALLBACK: lecturer echo after exception');
      return stringToStream(`(LLM error fallback) ${text}`);
    }
  }
  // Should not reach here, but in case no return happened inside attempts
  logger.warn({ provider: 'openai_glide', model }, 'Gliding to OpenAI after exhausting Anthropic retries');
  if (allowGlide && hasOpenAI) {
    // LOG#5 – fallback (glide)
    logger.warn({ tag: 'LOG#5', reason: 'glide', provider: 'openai' }, 'FALLBACK: gliding to OpenAI');
    try { return await callStudentModel({ text, context: params.context }); }
    catch (e) { logger.warn({ provider: 'openai_glide', error: String(e), model }, 'OpenAI glide failed'); }
  }
  // TODO: Exhausted all providers: echo fallback. Consider returning a structured error and guidance to user; log high-severity metric.
  logger.warn({ tag: 'LOG#5', reason: 'exhausted', provider: 'anthropic' }, 'FALLBACK: lecturer echo after exhausted retries');
  return stringToStream(`(LLM error fallback) ${text}`);
}
