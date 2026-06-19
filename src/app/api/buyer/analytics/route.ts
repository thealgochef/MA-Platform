import { NextResponse } from "next/server";
import { isAuthResponse, requireRole } from "@/server/auth";
import { getPreferredDealLabel } from "@/lib/deal-labels";

type AnalyticsDeal = {
  headline?: string | null;
  project_name?: string | null;
  industry?: string | null;
};

function getDealLabel(deal: AnalyticsDeal | null | undefined) {
  return getPreferredDealLabel(deal?.headline, deal?.project_name);
}

type EngagementRow = {
  id: string;
  stage: string;
  nda_status: string | null;
  created_at: string;
  updated_at: string;
  deal_id: string | null;
  deals: AnalyticsDeal | null;
};

const DANGEROUS_BUCKET_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function sanitizeBucketKey(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) return fallback;

  return DANGEROUS_BUCKET_KEYS.has(trimmedValue) ? fallback : trimmedValue;
}

function normalizeNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) return null;

    const parsedValue = Number(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function normalizeIndustryBucket(value: unknown): string {
  const normalizeSerializedIndustry = (rawValue: string): string | null => {
    const trimmedValue = rawValue.trim();
    if (trimmedValue.length === 0) return null;

    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
      try {
        const parsedValue = JSON.parse(trimmedValue);
        if (Array.isArray(parsedValue)) {
          const firstIndustry = parsedValue.find(
            (item): item is string => typeof item === "string" && item.trim().length > 0
          );

          if (firstIndustry) return firstIndustry.trim();
        }
      } catch {
        const bracketContents = trimmedValue.slice(1, -1).trim();
        const firstRawItem = bracketContents.split(",")[0]?.trim();

        if (!firstRawItem) return null;

        const firstTokenIsQuoted =
          (firstRawItem.startsWith("'") && firstRawItem.endsWith("'")) ||
          (firstRawItem.startsWith('"') && firstRawItem.endsWith('"'));

        if (!firstTokenIsQuoted) return null;

        const firstItem = firstRawItem.slice(1, -1).trim();
        return firstItem.length > 0 ? firstItem : null;
      }

      return null;
    }

    if (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) {
      const braceContents = trimmedValue.slice(1, -1).trim();
      const firstRawItem = braceContents.split(",")[0]?.trim();
      const firstItem = firstRawItem?.replace(/^['"]|['"]$/g, "").trim();
      if (firstItem) return firstItem;

      return null;
    }

    return trimmedValue;
  };

  if (Array.isArray(value)) {
    const firstIndustry = value.find((item): item is string => typeof item === "string" && item.trim().length > 0);
    return firstIndustry?.trim() ?? "Unknown";
  }

  if (typeof value !== "string") return "Unknown";

  const normalizedIndustry = normalizeSerializedIndustry(value);
  if (!normalizedIndustry) return "Unknown";

  return normalizedIndustry;
}

export async function GET() {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  // Fetch all engagements for this buyer with deal info
  const { data: engagements, error: engagementsError } = await supabase
    .from("deal_engagements")
    .select(`
      id,
      stage,
      nda_status,
      created_at,
      updated_at,
      deal_id,
      deals!inner (
        id,
        headline,
        project_name,
        industry,
        revenue_year_3,
        ebitda_year_3
      )
    `)
    .eq("buyer_user_id", user.id);

  if (engagementsError) {
    console.error("Failed to fetch buyer engagements analytics", {
      userId: user.id,
      error: engagementsError.message,
    });

    return NextResponse.json({ error: "Failed to load buyer analytics" }, { status: 500 });
  }

  const allEngagements: EngagementRow[] = Array.isArray(engagements)
    ? (engagements as unknown as EngagementRow[])
    : [];

  // Count IOIs and LOIs
  const { count: ioisCount, error: ioisError } = await supabase
    .from("iois")
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", user.id);

  if (ioisError) {
    console.error("Failed to fetch buyer IOI analytics", {
      userId: user.id,
      error: ioisError.message,
    });

    return NextResponse.json({ error: "Failed to load buyer analytics" }, { status: 500 });
  }

  const { count: loisCount, error: loisError } = await supabase
    .from("lois")
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", user.id);

  if (loisError) {
    console.error("Failed to fetch buyer LOI analytics", {
      userId: user.id,
      error: loisError.message,
    });

    return NextResponse.json({ error: "Failed to load buyer analytics" }, { status: 500 });
  }

  // Compute analytics
  const activeStages = ["pursued", "nda_pending", "nda_signed", "reviewing", "ioi_submitted", "loi_submitted", "diligence", "closed"];
  const pursuing = allEngagements.filter(e => activeStages.includes(e.stage)).length;
  const passed = allEngagements.filter(e => e.stage === "passed").length;
  const ndaSigned = allEngagements.filter(e => e.nda_status === "signed").length;

  // Deals by stage
  const dealsByStage: Record<string, number> = Object.create(null);
  for (const e of allEngagements) {
    const stage = sanitizeBucketKey(e.stage, "unknown");
    dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
  }

  // Deals by industry
  const dealsByIndustry: Record<string, number> = Object.create(null);
  for (const e of allEngagements) {
      const deal = e.deals as unknown as Record<string, unknown>;
      const industry = sanitizeBucketKey(normalizeIndustryBucket(deal?.industry), "Unknown");
      dealsByIndustry[industry] = (dealsByIndustry[industry] || 0) + 1;
  }

  // Average revenue and EBITDA of pursued deals
  const activeEngagements = allEngagements.filter(e => activeStages.includes(e.stage));
  const revenues = activeEngagements
    .map(e => normalizeNumericValue((e.deals as unknown as Record<string, unknown>)?.revenue_year_3))
    .filter((v): v is number => v != null);
  const ebitdas = activeEngagements
    .map(e => normalizeNumericValue((e.deals as unknown as Record<string, unknown>)?.ebitda_year_3))
    .filter((v): v is number => v != null);

  const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : null;
  const avgEbitda = ebitdas.length > 0 ? ebitdas.reduce((a, b) => a + b, 0) / ebitdas.length : null;

  // For matched deals, use all engagements
  const allRevenues = allEngagements
    .map(e => normalizeNumericValue((e.deals as unknown as Record<string, unknown>)?.revenue_year_3))
    .filter((v): v is number => v != null);
  const allEbitdas = allEngagements
    .map(e => normalizeNumericValue((e.deals as unknown as Record<string, unknown>)?.ebitda_year_3))
    .filter((v): v is number => v != null);

  const avgMatchedRevenue = allRevenues.length > 0 ? allRevenues.reduce((a, b) => a + b, 0) / allRevenues.length : null;
  const avgMatchedEbitda = allEbitdas.length > 0 ? allEbitdas.reduce((a, b) => a + b, 0) / allEbitdas.length : null;

  // Recent activity: use engagement changes as activity items
  const activity = allEngagements
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)
    .map(e => {
      const deal = e.deals as unknown as AnalyticsDeal | null;

      return {
        id: e.id,
        action: e.stage,
        deal_id: e.deal_id,
        deal_label: getDealLabel(deal),
        created_at: e.updated_at,
        details: null,
      };
    });

  return NextResponse.json({
    analytics: {
      pursuing,
      passed,
      ndaSigned,
      ioisSubmitted: ioisCount || 0,
      loisSubmitted: loisCount || 0,
      dealsByStage,
      avgRevenue,
      avgEbitda,
      avgMatchedRevenue,
      avgMatchedEbitda,
      dealsByIndustry,
    },
    activity,
  });
}
