import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isValidDealTransition } from "@/lib/deal-status";
import { dealStatusUpdateSchema } from "@/lib/validators";
import { notifyBuyers } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!deal || deal.firm_id !== profile.firm_id) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = dealStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "newStatus is required" }, { status: 400 });
    }

    const { newStatus, winningEngagementId } = parsed.data;

    if (!isValidDealTransition(deal.status, newStatus)) {
      return NextResponse.json(
        { error: `Invalid transition from ${deal.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    const adminClient = createAdminClient();

    // Publishing: draft -> accepting_iois
    if (deal.status === "draft" && newStatus === "accepting_iois") {
      if (!deal.cim_document_path) {
        return NextResponse.json({ error: "CIM is required to publish" }, { status: 400 });
      }
      if (!deal.teaser_document_path) {
        return NextResponse.json({ error: "Teaser is required to publish" }, { status: 400 });
      }
      if (deal.nda_type === "custom" && !deal.nda_document_path) {
        return NextResponse.json({ error: "Custom NDA is required to publish" }, { status: 400 });
      }
      updateData.published_at = new Date().toISOString();
    }

    // Closing
    if (newStatus === "closed") {
      if (!winningEngagementId) {
        return NextResponse.json({ error: "winningEngagementId is required to close a deal" }, { status: 400 });
      }

      const { error: closeError } = await adminClient.rpc("close_deal_with_winning_engagement", {
        p_deal_id: params.id,
        p_engagement_id: winningEngagementId,
      });

      if (closeError) {
        if (closeError.code === "22023") {
          return NextResponse.json({ error: "Winning engagement is not eligible to close this deal" }, { status: 400 });
        }

        return NextResponse.json({ error: "Failed to update deal status" }, { status: 500 });
      }
    }

    if (newStatus !== "closed") {
      const { error: updateError } = await supabase
        .from("deals")
        .update(updateData)
        .eq("id", params.id);

      if (updateError) {
        return NextResponse.json({ error: "Failed to update deal status" }, { status: 500 });
      }
    }

    // Handle terminate: set all engagements to terminated
    if (newStatus === "terminated") {
      await adminClient
        .from("deal_engagements")
        .update({ stage: "terminated" })
        .eq("deal_id", params.id)
        .not("stage", "in", '("terminated","passed","declined")');

      notifyBuyers("deal_terminated", params.id);
    }

    // Log activity
    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: `deal_status_${newStatus}`,
      metadata: { from: deal.status, to: newStatus, winningEngagementId },
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
