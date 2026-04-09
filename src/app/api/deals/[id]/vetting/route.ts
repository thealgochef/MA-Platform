import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { notifyBuyer } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify broker owns this deal
  const { data: profile } = await supabase
    .from("users")
    .select("role, status, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "broker" || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("id, firm_id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const body = await request.json();
  const { engagementId, action, reason } = body;

  if (!engagementId || !action) {
    return NextResponse.json({ error: "engagementId and action are required" }, { status: 400 });
  }

  // Fetch the engagement
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, buyer_user_id, stage, nda_status, vetting_status")
    .eq("id", engagementId)
    .eq("deal_id", params.id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
  }

  if (action === "approve") {
    // Approve: set nda_status to sent, vetting_status to approved
    const { error } = await supabase
      .from("deal_engagements")
      .update({
        nda_status: "sent",
        vetting_status: "approved",
        stage: "nda_pending",
      })
      .eq("id", engagementId);

    if (error) {
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "buyer_vetting_approved",
      metadata: { engagement_id: engagementId, buyer_user_id: engagement.buyer_user_id },
    });

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "nda_sent",
      metadata: { buyer_user_id: engagement.buyer_user_id },
    });

    return NextResponse.json({ success: true, status: "approved" });
  }

  if (action === "reject") {
    // Reject: set vetting_status to rejected, vetting_rejection_reason, stage to terminated
    const vetting_rejection_reason = reason || "Other";

    const { error } = await supabase
      .from("deal_engagements")
      .update({
        vetting_status: "rejected",
        vetting_rejection_reason,
        nda_status: "rejected",
        stage: "terminated",
      })
      .eq("id", engagementId);

    if (error) {
      return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
    }

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "buyer_vetting_rejected",
      metadata: {
        engagement_id: engagementId,
        buyer_user_id: engagement.buyer_user_id,
        reason: vetting_rejection_reason,
      },
    });

    notifyBuyer("vetting_rejected", params.id, engagement.buyer_user_id);

    return NextResponse.json({ success: true, status: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 });
}
