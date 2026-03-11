import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { matchDealsToProject, type MatchCriteria, type DealForMatching } from "@/lib/matching";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the project and verify ownership
  const { data: project } = await supabase
    .from("buyer_projects")
    .select("*")
    .eq("id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch all active deals
  const { data: deals } = await supabase
    .from("deals")
    .select("id, headline, description, industry, state, region, geography_display, status, revenue_year_3, ebitda_year_3, ioi_due_date, loi_due_date")
    .in("status", ["accepting_iois", "accepting_lois", "under_loi"]);

  // Build match criteria from project
  const criteria: MatchCriteria = {
    industry: project.industry || undefined,
    revenueMin: project.revenue_min || undefined,
    revenueMax: project.revenue_max || undefined,
    ebitdaMin: project.ebitda_min || undefined,
    ebitdaMax: project.ebitda_max || undefined,
    ebitdaMargin: project.ebitda_margin || undefined,
    location: project.location || undefined,
    keywords: project.keywords || undefined,
  };

  // Map DB fields to matching interface
  const dealsForMatching: DealForMatching[] = (deals || []).map(d => ({
    id: d.id,
    industry: d.industry,
    state: d.state || undefined,
    region: d.region || undefined,
    revenueYear3: d.revenue_year_3 || undefined,
    ebitdaYear3: d.ebitda_year_3 || undefined,
    headline: d.headline,
    description: d.description,
    status: d.status,
  }));

  const matched = matchDealsToProject(dealsForMatching, criteria);
  const matchedIds = matched.map(d => d.id);

  // Fetch existing engagements for this buyer across matched deals
  const { data: engagements } = await supabase
    .from("deal_engagements")
    .select("*")
    .eq("buyer_user_id", user.id)
    .in("deal_id", matchedIds.length > 0 ? matchedIds : ["__none__"]);

  // Parse cursor for pagination
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = 20;

  // Map engagements by deal_id
  const engagementMap = new Map(
    (engagements || []).map(e => [e.deal_id, e])
  );

  // Build result with engagement info
  const results = matched.map(deal => {
    const dbDeal = (deals || []).find(d => d.id === deal.id);
    return {
      ...dbDeal,
      engagement: engagementMap.get(deal.id) || null,
    };
  });

  // Apply cursor-based pagination
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = results.findIndex(r => r.id === cursor);
    if (cursorIndex >= 0) startIndex = cursorIndex + 1;
  }

  const page = results.slice(startIndex, startIndex + limit);
  const nextCursor = page.length === limit ? page[page.length - 1].id : null;

  return NextResponse.json({
    deals: page,
    nextCursor,
    total: results.length,
  });
}
