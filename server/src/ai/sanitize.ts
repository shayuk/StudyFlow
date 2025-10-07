export function sanitizeRetrievedText(t: string): string {
  return (t || "")
    .replace(/```system[\s\S]*?```/gi, "")
    .replace(/\b(SYSTEM|OVERRIDE|INSTRUCTION)\b\s*:/gi, "")
    .slice(0, 8000);
}

export function asksForPrompt(u: string): boolean {
  const s = (u || "").toLowerCase();
  return /what.*(are|is).*your.*(rules|prompt|instructions)|print.*prompt|show.*system/.test(s)
      || /הוראות.*שלך|מה.*הכללים.*שלך|הצג.*פרומפט/.test(s);
}

export function triesToOverride(u: string): boolean {
  const s = (u || "").toLowerCase();
  return /ignore.*(previous|all).*instructions|you must obey|override rules/.test(s)
      || /התעלם.*מהוראות|בטל.*כללים/.test(s);
}
