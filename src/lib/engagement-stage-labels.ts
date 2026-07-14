const ENGAGEMENT_STAGE_ACRONYMS = new Set(["nda", "ioi", "loi"]);

export function formatEngagementStageLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const tokens = value
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (ENGAGEMENT_STAGE_ACRONYMS.has(token.toLowerCase())) {
        return token.toUpperCase();
      }

      return token.toLowerCase();
    });

  if (tokens.length === 0) {
    return "—";
  }

  const [firstWord, ...remainingWords] = tokens;
  const normalizedFirstWord = ENGAGEMENT_STAGE_ACRONYMS.has(firstWord.toLowerCase())
    ? firstWord.toUpperCase()
    : firstWord.charAt(0).toUpperCase() + firstWord.slice(1);

  return [normalizedFirstWord, ...remainingWords].join(" ");
}
