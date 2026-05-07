import { NextResponse } from "next/server";
import { isAuthResponse, requireRole } from "@/server/auth";

export async function GET() {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  // Fetch all engagements for this buyer with deal info
  const { data: engagements } = await supabase
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
        industry,
        revenue_year_3,
        ebitda_year_3
      )
    `)
    .eq("buyer_user_id", user.id);

  const allEngagements = engagements || [];

  // Count IOIs and LOIs
  const { count: ioisCount } = await supabase
    .from("iois")
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", user.id);

  const { count: loisCount } = await supabase
    .from("lois")
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", user.id);

  // Compute analytics
  const activeStages = ["pursued", "nda_pending", "nda_signed", "reviewing", "ioi_submitted", "loi_submitted", "diligence", "closed"];
  const pursuing = allEngagements.filter(e => activeStages.includes(e.stage)).length;
  const passed = allEngagements.filter(e => e.stage === "passed").length;
  const ndaSigned = allEngagements.filter(e => e.nda_status === "signed").length;

  // Deals by stage
  const dealsByStage: Record<string, number> = {};
  for (const e of allEngagements) {
    dealsByStage[e.stage] = (dealsByStage[e.stage] || 0) + 1;
  }

  // Deals by industry
  const dealsByIndustry: Record<string, number> = {};
  for (const e of allEngagements) {
    const deal = e.deals as unknown as Record<string, unknown>;
    const industry = (deal?.industry as string) || "Unknown";
    dealsByIndustry[industry] = (dealsByIndustry[industry] || 0) + 1;
  }

  // Average revenue and EBITDA of pursued deals
  const activeEngagements = allEngagements.filter(e => activeStages.includes(e.stage));
  const revenues = activeEngagements
    .map(e => (e.deals as unknown as Record<string, unknown>)?.revenue_year_3 as number | null)
    .filter((v): v is number => v != null);
  const ebitdas = activeEngagements
    .map(e => (e.deals as unknown as Record<string, unknown>)?.ebitda_year_3 as number | null)
    .filter((v): v is number => v != null);

  const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : null;
  const avgEbitda = ebitdas.length > 0 ? ebitdas.reduce((a, b) => a + b, 0) / ebitdas.length : null;

  // For matched deals, use all engagements
  const allRevenues = allEngagements
    .map(e => (e.deals as unknown as Record<string, unknown>)?.revenue_year_3 as number | null)
    .filter((v): v is number => v != null);
  const allEbitdas = allEngagements
    .map(e => (e.deals as unknown as Record<string, unknown>)?.ebitda_year_3 as number | null)
    .filter((v): v is number => v != null);

  const avgMatchedRevenue = allRevenues.length > 0 ? allRevenues.reduce((a, b) => a + b, 0) / allRevenues.length : null;
  const avgMatchedEbitda = allEbitdas.length > 0 ? allEbitdas.reduce((a, b) => a + b, 0) / allEbitdas.length : null;

  // Recent activity: use engagement changes as activity items
  const activity = allEngagements
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)
    .map(e => ({
      id: e.id,
      action: e.stage,
      deal_id: e.deal_id,
      created_at: e.updated_at,
      details: null,
    }));

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
