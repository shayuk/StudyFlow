export function extractKeywords(q: string): string[] {
  return (q || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .slice(0, 6);
}

export function logNoCoverage(payload: {
  userId: string;
  courseId: string;
  query: string;
  keywords: string[];
}) {
  // TODO: replace with your DB/analytics sink
  // Example: console + future DB write
  console.info("[no_coverage]", JSON.stringify(payload));
}
