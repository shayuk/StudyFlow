import fs from "node:fs";
import yaml from "js-yaml";

function readIfExists(p: string): string | undefined {
  try { return fs.readFileSync(p, "utf8"); } catch { return undefined; }
}

export const STUDENT_SYSTEM_PROMPT_PATH =
  process.env.STUDENT_SYSTEM_PROMPT_PATH ?? "server/prompts/student.system.en.md";

export const STUDENT_YAML_CONFIG_PATH =
  process.env.STUDENT_CONFIG_PATH ?? "server/config/student.bot.config.yaml";

export const STUDENT_JSON_CONFIG_PATH =
  process.env.STUDENT_CONFIG_JSON_PATH ?? "server/config/student.bot.config.json";

// system prompt
export const studentSystemPrompt =
  readIfExists(STUDENT_SYSTEM_PROMPT_PATH) ?? "# MISSING student.system.en.md";

// config (YAML preferred; JSON fallback)
let cfg: unknown = {};
const yamlText = readIfExists(STUDENT_YAML_CONFIG_PATH);
const jsonText = readIfExists(STUDENT_JSON_CONFIG_PATH);

if (yamlText) cfg = yaml.load(yamlText) ?? {};
else if (jsonText) cfg = JSON.parse(jsonText);
export const studentConfig: unknown = cfg;

function pick<T>(obj: unknown, path: (string | number)[], fallback: T): T {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key as string];
    } else {
      return fallback;
    }
  }
  return (cur as T) ?? fallback;
}

export const LANG_DEFAULT = pick<string>(studentConfig, ["language", "default"], "he-IL");
export const TLDR_THRESHOLD = pick<number>(studentConfig, ["language", "tldr_threshold_words"], 120);

export const RAG_TOP_K = pick<number>(studentConfig, ["retrieval", "top_k"], 5);
export const SIM_THRESHOLD_DEFAULT = pick<number>(studentConfig, ["retrieval", "threshold_default"], 0.28);
export const SIM_THRESHOLD_BY_MODULE = pick<Record<string, number>>(studentConfig, ["retrieval", "threshold_by_module"], {});
export const CLOSED_CORPUS_ONLY = !!pick<boolean>(studentConfig, ["retrieval", "closed_corpus_only"], false);

export const SHOW_CONFIDENCE = !!pick<boolean>(studentConfig, ["output", "show_confidence"], false);
export const CONFIDENCE_RULE = pick<Record<string, unknown>>(studentConfig, ["output", "confidence_heuristic"], {});

export const FAST_PASS_TOKENS = pick<string[]>(studentConfig, ["modes", "fast_pass_tokens"], ["final:", "answer:", "full:"]);
export const CRITIQUE_TOKENS = pick<string[]>(studentConfig, ["modes", "critique_tokens"], ["mistake:", "critique:"]);

export const INTEGRITY = pick<Record<string, unknown>>(studentConfig, ["integrity"], {});
export const NON_DISCLOSURE = pick<Record<string, unknown>>(studentConfig, ["security", "non_disclosure"], {});
export const INJECTION_GUARD = pick<Record<string, unknown>>(studentConfig, ["security", "prompt_injection_resistance"], {});
export const TEMPLATES = pick<Record<string, string>>(studentConfig, ["templates"], {} as Record<string, string>);
