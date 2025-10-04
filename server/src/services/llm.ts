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
  if (isTest || !hasOpenAI) {
    return stringToStream(`(DEV fallback) ${text}`);
  }
  // OpenAI Responses API (stream mode)
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
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
  });
  if (!resp.ok || !resp.body) {
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

// Safely read response body for diagnostics
type TextReadable = { text: () => Promise<string> };
async function safeReadText(resp?: TextReadable): Promise<string> {
  try { return resp ? await resp.text() : '<no body>'; } catch { return '<unreadable body>'; }
}

export async function callLecturerModel(params: { text: string; context?: LlmContext; highGear?: boolean }): Promise<TextStream> {
  const { text, highGear } = params;
  if (isTest || !hasAnthropic) {
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
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
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
      });
      if (!resp.ok || !resp.body) {
        // Retry only on transient errors (429 / 5xx). Otherwise break to glide/fallback.
        const transient = resp.status === 429 || (resp.status >= 500 && resp.status <= 599);
        if (transient && i < attempts - 1) {
          await new Promise((r) => setTimeout(r, baseDelayMs * i));
          continue;
        }
        const bodyText = await safeReadText(resp);
        logger.warn({ provider: 'openai_glide', status: resp.status, statusText: resp.statusText, model, body: bodyText }, 'Gliding to OpenAI from Anthropic failure');
        if (allowGlide && hasOpenAI) {
          try { return await callStudentModel({ text, context: params.context }); }
          catch (e) { logger.warn({ provider: 'openai_glide', error: String(e), model }, 'OpenAI glide failed'); }
        }
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
      logger.warn({ provider: 'openai_glide', error: detail, model }, 'Gliding to OpenAI from Anthropic exception');
      if (allowGlide && hasOpenAI) {
        try { return await callStudentModel({ text, context: params.context }); }
        catch (e) { logger.warn({ provider: 'openai_glide', error: String(e), model }, 'OpenAI glide failed'); }
      }
      return stringToStream(`(LLM error fallback) ${text}`);
    }
  }
  // Should not reach here, but in case no return happened inside attempts
  logger.warn({ provider: 'openai_glide', model }, 'Gliding to OpenAI after exhausting Anthropic retries');
  if (allowGlide && hasOpenAI) {
    try { return await callStudentModel({ text, context: params.context }); }
    catch (e) { logger.warn({ provider: 'openai_glide', error: String(e), model }, 'OpenAI glide failed'); }
  }
  return stringToStream(`(LLM error fallback) ${text}`);
}
