export const CONFIDENTIAL_DEAL_LABEL = "Confidential Deal";

function normalizeDealLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getPreferredDealLabel(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const normalized = normalizeDealLabel(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return CONFIDENTIAL_DEAL_LABEL;
}
