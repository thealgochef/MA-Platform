import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const industry = url.searchParams.get("industry");
  const revenueMin = url.searchParams.get("revenueMin");
  const revenueMax = url.searchParams.get("revenueMax");
  const ebitdaMin = url.searchParams.get("ebitdaMin");
  const ebitdaMax = url.searchParams.get("ebitdaMax");
  const location = url.searchParams.get("location");
  const keyword = url.searchParams.get("keyword");
  const cursor = url.searchParams.get("cursor");
  const limit = 20;

  // Fetch buyer's NDA-signed deals to determine paused deal visibility
  const { data: ndaEngagements } = await supabase
    .from("deal_engagements")
    .select("deal_id")
    .eq("buyer_user_id", user.id)
    .in("nda_status", ["signed"]);

  const ndaSignedDealIds = (ndaEngagements || []).map(e => e.deal_id);

  // Build query — active deals + paused (for NDA-signed) + closed (for engaged)
  let query = supabase
    .from("deals")
    .select("id, headline, description, industry, state, region, geography_display, status, revenue_year_3, ebitda_year_3, ioi_due_date, loi_due_date, published_at")
    .in("status", ["accepting_iois", "accepting_lois", "under_loi", "paused", "closed"])
    .order("published_at", { ascending: false });

  // Apply filters
  if (industry) {
    query = query.eq("industry", industry);
  }
  if (revenueMin) {
    query = query.gte("revenue_year_3", parseFloat(revenueMin));
  }
  if (revenueMax) {
    query = query.lte("revenue_year_3", parseFloat(revenueMax));
  }
  if (ebitdaMin) {
    query = query.gte("ebitda_year_3", parseFloat(ebitdaMin));
  }
  if (ebitdaMax) {
    query = query.lte("ebitda_year_3", parseFloat(ebitdaMax));
  }
  if (location) {
    query = query.eq("state", location);
  }
  if (keyword) {
    query = query.or(`headline.ilike.%${keyword}%,description.ilike.%${keyword}%`);
  }

  const { data: allDeals, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }

  // Fetch all buyer engagements
  const { data: engagements } = await supabase
    .from("deal_engagements")
    .select("*")
    .eq("buyer_user_id", user.id);

  const engagementMap = new Map(
    (engagements || []).map(e => [e.deal_id, e])
  );

  // Filter deals based on visibility rules:
  // - Active deals: visible to all
  // - Paused deals: only visible to NDA-signed buyers (badge, not clickable)
  // - Closed deals: visible to engaged buyers (badge, not clickable)
  const visibleDeals = (allDeals || []).filter(deal => {
    if (["accepting_iois", "accepting_lois", "under_loi"].includes(deal.status)) {
      return true;
    }
    if (deal.status === "paused") {
      return ndaSignedDealIds.includes(deal.id);
    }
    if (deal.status === "closed") {
      return engagementMap.has(deal.id);
    }
    return false;
  });

  // Attach engagement data
  const results = visibleDeals.map(deal => ({
    ...deal,
    engagement: engagementMap.get(deal.id) || null,
  }));

  // Cursor-based pagination
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
