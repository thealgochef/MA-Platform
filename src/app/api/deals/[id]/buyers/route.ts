import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, status, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "broker" || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify deal belongs to broker's firm
  const { data: deal } = await supabase
    .from("deals")
    .select("firm_id")
    .eq("id", params.id)
    .single();

  if (!deal || deal.firm_id !== profile.firm_id) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Fetch engagements with buyer users and firms data
  const { data: engagements, error } = await supabase
    .from("deal_engagements")
    .select(`
      *,
      users:buyer_user_id (id, full_name, email, buyer_type, firms (id, name, website))
    `)
    .eq("deal_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }

  // Fetch IOIs and LOIs for each engagement
  const engagementIds = (engagements || []).map((e: { id: string }) => e.id);

  const { data: iois } = await supabase
    .from("iois")
    .select("*")
    .in("engagement_id", engagementIds.length > 0 ? engagementIds : ["none"]);

  const { data: lois } = await supabase
    .from("lois")
    .select("*")
    .in("engagement_id", engagementIds.length > 0 ? engagementIds : ["none"]);

  return NextResponse.json({
    engagements: engagements || [],
    iois: iois || [],
    lois: lois || [],
  });
}
