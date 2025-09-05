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

export async function callLecturerModel(params: { text: string; context?: LlmContext; highGear?: boolean }): Promise<TextStream> {
  const { text, highGear } = params;
  if (isTest || !hasAnthropic) {
    return stringToStream(`(DEV fallback) ${text}`);
  }
  // Using Anthropic messages API with streaming SSE
  const model = highGear ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20240620';
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
