import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
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

  if (!profile || profile.role !== "buyer" || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch the deal to check status and nda_vetting_preference
  const { data: deal } = await supabase
    .from("deals")
    .select("id, status, nda_vetting_preference, firm_id")
    .eq("id", params.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const activeStatuses = ["accepting_iois", "accepting_lois", "under_loi"];
  if (!activeStatuses.includes(deal.status)) {
    return NextResponse.json({ error: "Deal is not accepting engagement" }, { status: 400 });
  }

  // Check if already engaged
  const { data: existing } = await supabase
    .from("deal_engagements")
    .select("id, stage")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (existing && existing.stage !== "declined") {
    return NextResponse.json({ error: "Already engaged with this deal" }, { status: 400 });
  }

  // Parse optional project_id from body
  const body = await request.json().catch(() => ({}));
  const projectId = body.projectId || null;

  // Determine engagement stage and NDA status based on vetting preference
  let stage: string;
  let ndaStatus: string;
  let vettingStatus: string | null = null;

  if (deal.nda_vetting_preference === "auto") {
    stage = "nda_pending";
    ndaStatus = "sent";
  } else {
    stage = "pursued";
    ndaStatus = "pending_review";
    vettingStatus = "pending";
  }

  if (existing && existing.stage === "declined") {
    // Re-engage: update existing engagement
    const { data: engagement, error } = await supabase
      .from("deal_engagements")
      .update({
        stage,
        nda_status: ndaStatus,
        vetting_status: vettingStatus,
        project_id: projectId,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to pursue deal" }, { status: 500 });
    }

    // Log activity
    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "buyer_pursued",
      details: { buyer_firm_id: profile.firm_id, re_engagement: true },
    });

    return NextResponse.json({ engagement });
  }

  // Create new engagement
  const { data: engagement, error } = await supabase
    .from("deal_engagements")
    .insert({
      deal_id: params.id,
      buyer_user_id: user.id,
      buyer_firm_id: profile.firm_id,
      project_id: projectId,
      stage,
      nda_status: ndaStatus,
      vetting_status: vettingStatus,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to pursue deal" }, { status: 500 });
  }

  // Log activity
  await supabase.from("deal_activity_log").insert({
    deal_id: params.id,
    actor_id: user.id,
    action: "buyer_pursued",
    details: { buyer_firm_id: profile.firm_id },
  });

  if (deal.nda_vetting_preference === "auto") {
    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "nda_sent",
      details: { buyer_user_id: user.id },
    });
  }

  return NextResponse.json({ engagement }, { status: 201 });
}
