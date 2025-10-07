import fs from "node:fs";
import path from "node:path";
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
let _studentConfig: any = {};
const yamlText = readIfExists(STUDENT_YAML_CONFIG_PATH);
const jsonText = readIfExists(STUDENT_JSON_CONFIG_PATH);

if (yamlText) _studentConfig = yaml.load(yamlText) as any;
else if (jsonText) _studentConfig = JSON.parse(jsonText);
export const studentConfig = _studentConfig ?? {};

export const LANG_DEFAULT = studentConfig?.language?.default ?? "he-IL";
export const TLDR_THRESHOLD = studentConfig?.language?.tldr_threshold_words ?? 120;

export const RAG_TOP_K = studentConfig?.retrieval?.top_k ?? 5;
export const SIM_THRESHOLD_DEFAULT = studentConfig?.retrieval?.threshold_default ?? 0.28;
export const SIM_THRESHOLD_BY_MODULE = studentConfig?.retrieval?.threshold_by_module ?? {} as Record<string, number>;
export const CLOSED_CORPUS_ONLY = !!studentConfig?.retrieval?.closed_corpus_only;

export const SHOW_CONFIDENCE = !!studentConfig?.output?.show_confidence;
export const CONFIDENCE_RULE = studentConfig?.output?.confidence_heuristic ?? {};

export const FAST_PASS_TOKENS: string[] = studentConfig?.modes?.fast_pass_tokens ?? ["final:", "answer:", "full:"];
export const CRITIQUE_TOKENS: string[] = studentConfig?.modes?.critique_tokens ?? ["mistake:", "critique:"];

export const INTEGRITY = studentConfig?.integrity ?? {};
export const NON_DISCLOSURE = studentConfig?.security?.non_disclosure ?? {};
export const INJECTION_GUARD = studentConfig?.security?.prompt_injection_resistance ?? {};
export const TEMPLATES = studentConfig?.templates ?? {};
