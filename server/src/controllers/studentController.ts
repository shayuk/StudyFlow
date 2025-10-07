import {
  CLOSED_CORPUS_ONLY, FAST_PASS_TOKENS, CRITIQUE_TOKENS,
  TEMPLATES, NON_DISCLOSURE, LANG_DEFAULT, SHOW_CONFIDENCE
} from "../ai/config";
import { asksForPrompt, triesToOverride } from "../ai/sanitize";
import { logNoCoverage, extractKeywords } from "../telemetry/log";
import { retrieveAndSanitize, getThreshold } from "../ai/retrieval";

// ---- types ----
type Ctx = {
  userId: string;
  courseId: string;
  moduleId?: string;
};

// ---- public handler used by router ----
export async function handleStudentTurn(ctx: Ctx, userText: string) {
  // Non-disclosure & injection guard
  if (asksForPrompt(userText) || triesToOverride(userText)) {
    const refusal = TEMPLATES?.disclosure_refusal ?? NON_DISCLOSURE?.disclosure_refusal_message
      ?? "I can’t share my internal instructions. Let’s continue within the course scope.";
    return { text: refusal, lang: LANG_DEFAULT };
  }

  // Language policy (default Hebrew; switch only if explicitly asked)
  const lang = detectExplicitLanguageSwitch(userText) ?? LANG_DEFAULT;

  // Closed-corpus retrieval & coverage decision
  const moduleKey = ctx?.moduleId ?? "default";
  const threshold = getThreshold(moduleKey);
  const { hits, avgSim, coherentSources } = retrieveAndSanitize(userText, moduleKey);

  const covered = avgSim; // simple heuristic
  if (covered < threshold) {
    logNoCoverage({
      userId: ctx.userId, courseId: ctx.courseId,
      query: userText, keywords: extractKeywords(userText)
    });
    return { text: TEMPLATES?.no_coverage
      ?? "The course corpus doesn’t cover this question yet.", lang };
  }

  // mode selection
  const isFast = startsWithAny(userText, FAST_PASS_TOKENS);
  const isCrit = startsWithAny(userText, CRITIQUE_TOKENS);

  // Build response based solely on internal hits:
  const sourcesList = hits.slice(0, 5).map(h => sourceLine(h)).join("\n");
  const confidence = computeConfidence(avgSim, coherentSources);

  if (isFast) {
    const answer = await generateFromCorpus(userText, hits, { mode: "fast", lang });
    const tldr = makeTLDR(answer, lang);
    return {
      text:
`**Answer (from course corpus):**
${answer}

**Internal sources:**
${sourcesList}

**Confidence:** ${confidence}
${tldr}`,
      lang
    };
  }

  if (isCrit) {
    const critique = await generateFromCorpus(userText, hits, { mode: "critique", lang });
    const tldr = makeTLDR(critique, lang);
    return {
      text:
`**Gentle critique (corpus-based):**
${critique}

**Internal sources:**
${sourcesList}

**Confidence:** ${confidence}
${tldr}`,
      lang
    };
  }

  // Socratic default
  const step = await generateFromCorpus(userText, hits, { mode: "socratic", lang });
  const tldr = makeTLDR(step, lang);
  return {
    text: SHOW_CONFIDENCE
      ? `${step}\n\n**Confidence:** ${confidence}\n${tldr}`
      : `${step}\n${tldr}`,
    lang
  };
}

// ---- helpers ----
function startsWithAny(s: string, tokens: string[]) {
  const t = (s || "").trim().toLowerCase();
  return tokens.some(x => t.startsWith(x.toLowerCase()));
}
function sourceLine(h: any) {
  const sec = h.section ? `, ${h.section}` : "";
  const pg = h.page ? `, p.${h.page}` : "";
  return `- ${h.source}${sec}${pg}`;
}
function computeConfidence(avgSim: number, coherentSources: number): "High"|"Medium"|"Low" {
  if (avgSim >= 0.55 && coherentSources >= 3) return "High";
  if (avgSim >= 0.35 && coherentSources >= 2) return "Medium";
  return "Low";
}
function detectExplicitLanguageSwitch(u: string): string | undefined {
  const s = (u || "").toLowerCase();
  if (/^english[: ,]/.test(s) || /reply in english/.test(s)) return "en-US";
  if (/^arabic[: ,]/.test(s)  || /reply in arabic/.test(s))  return "ar";
  return undefined;
}
function makeTLDR(text: string, lang: string): string {
  const words = (text || "").split(/\s+/).length;
  if (words < 120) return "";
  const label = (lang.startsWith("he")) ? "**TL;DR:**" : (lang.startsWith("ar") ? "**ملخص:**" : "**TL;DR:**");
  const firstSentence = (text || "").split(/(?<=[.!?])\s+/)[0]?.slice(0, 160);
  return `${label} ${firstSentence} ...`;
}

/**
 * Minimal, LLM-free generator so שהקוד ירוץ “out of the box”.
 * מחליף את קריאת ה-LLM האמיתית עד שתחברי את מנוע ה־AI שלך.
 */
async function generateFromCorpus(userText: string, hits: any[], opts: { mode: "fast"|"critique"|"socratic", lang: string }): Promise<string> {
  const top = hits[0]?.text?.trim() ?? "";
  const lang = opts.lang || "he-IL";

  if (opts.mode === "fast") {
    return lang.startsWith("he")
      ? `תשובה ישירה מתוך מאגר הקורס: ${summ(top)}`
      : `Direct answer from the course corpus: ${summ(top)}`;
  }

  if (opts.mode === "critique") {
    return lang.startsWith("he")
      ? `נראה שחלק מן ההנמקה שלך דורש חידוד: השווי מול הסעיף הרלוונטי במאגר. רמז: ${summ(top)}`
      : `Parts of your reasoning likely need sharpening. Compare to the relevant section in the corpus. Hint: ${summ(top)}`;
  }

  // Socratic default
  return lang.startsWith("he")
    ? `יעדי למידה (קצר):\n• להבין את מושגי היסוד בשאלה\n• לזהות את ההנחות\n• לחבר את המושגים לדוגמה מהקורס\n\nשאלה מנחה: מה הקשר בין השאלה שלך לבין הרעיון הבא מתוך המאגר?\n"${summ(top)}"\nנסי לפרק לשני צעדים: (1) הגדרה, (2) יישום.`
    : `Learning goals:\n• Clarify core terms\n• Identify assumptions\n• Link to an in-course example\n\nGuiding question: how does your question connect to this idea from the corpus?\n"${summ(top)}"\nSplit it into two steps: (1) definition, (2) application.`;
}

function summ(s: string, n = 220) {
  if (!s) return "(no excerpt available)";
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n) + "…" : clean;
}
