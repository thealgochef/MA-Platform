export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function parsePostgresArrayString(value: string): string[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  const inner = trimmed.slice(1, -1);
  if (!inner.trim()) {
    return [];
  }

  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let isEscaped = false;

  for (const char of inner) {
    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (inQuotes) {
      if (char === '"') {
        inQuotes = false;
        continue;
      }

      current += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (isEscaped) {
    current += "\\";
  }

  if (inQuotes) {
    return null;
  }

  parts.push(current.trim());
  return parts.filter(Boolean);
}

export function formatIndustryDisplay(value: unknown): string {
  if (value == null) {
    return "—";
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "—";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "—";
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return formatIndustryDisplay(parsed);
        }
      } catch {
        // Not valid JSON array; fall through to plain string handling.
      }
    }

    const postgresArray = parsePostgresArrayString(trimmed);
    if (postgresArray) {
      return formatIndustryDisplay(postgresArray);
    }

    return trimmed;
  }

  return String(value);
}
