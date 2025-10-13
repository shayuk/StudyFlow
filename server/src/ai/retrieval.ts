import { SIM_THRESHOLD_DEFAULT, SIM_THRESHOLD_BY_MODULE, RAG_TOP_K } from "./config";
import { sanitizeRetrievedText } from "./sanitize";

export type Passage = { id: string; source: string; section?: string; page?: string; sim: number; text: string };
export type RetrievalResult = { hits: Passage[]; avgSim: number; coherentSources: number };

export function retrieveTopK(query: string, k: number): Passage[] {
  // TODO: hook your vector store / Qdrant / etc.
  void query; // silence unused until implemented
  void k;
  return []; // placeholder
}

export function evalCoverage(hits: Passage[]): { avgSim: number; coherentSources: number } {
  const avg = hits.length ? hits.reduce((s, h) => s + (h.sim || 0), 0) / hits.length : 0;
  const bySrc = new Set(hits.map(h => h.source));
  return { avgSim: avg, coherentSources: bySrc.size };
}

export function getThreshold(moduleKey: string): number {
  return (SIM_THRESHOLD_BY_MODULE as Record<string, number>)[moduleKey] ?? SIM_THRESHOLD_DEFAULT;
}

export function retrieveAndSanitize(query: string, moduleKey = "default"): RetrievalResult {
  void moduleKey; // threshold handled by caller for now
  const raw = retrieveTopK(query, RAG_TOP_K);
  const hits = raw.map(h => ({ ...h, text: sanitizeRetrievedText(h.text) }));
  const { avgSim, coherentSources } = evalCoverage(hits);
  return { hits, avgSim, coherentSources };
}
