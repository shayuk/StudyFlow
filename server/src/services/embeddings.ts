// Lightweight local embeddings stub (deterministic hashing)
// Avoids external API keys and works in dev/test. Not for production quality.

const DIM = 384;

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0; // unsigned
}

export function embedText(text: string): number[] {
  const v = new Float32Array(DIM);
  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const t of tokens) {
    const h = hashStr(t) % DIM;
    v[h] += 1;
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return Array.from(v);
}

export const EMBEDDING_DIM = DIM;
