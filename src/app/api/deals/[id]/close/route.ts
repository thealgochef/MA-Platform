import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { calculateFees } from "@/lib/deal-status";
import { notifyBroker, notifyAdmin } from "@/lib/notifications";
import { closeActionSchema, closeReportSchema, isValidStorageObjectKey } from "@/lib/validators";
import { isAuthResponse, requireApprovedUser } from "@/server/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireApprovedUser();
  if (isAuthResponse(context)) {
    return context;
  }

  const { supabase, user, profile } = context;

  let closureQuery = supabase
    .from("deal_closures")
    .select("*")
    .eq("deal_id", params.id);

  if (profile.role === "buyer") {
    closureQuery = closureQuery.eq("buyer_user_id", user.id);
  } else if (profile.role === "broker") {
    if (!profile.firm_id) {
      return NextResponse.json({ error: "No closure record found" }, { status: 404 });
    }
    closureQuery = closureQuery.eq("broker_firm_id", profile.firm_id);
  } else if (profile.role !== "admin") {
    return NextResponse.json({ error: "No closure record found" }, { status: 404 });
  }

  const { data: closure, error: closureError } = await closureQuery.single();

  if (closureError) {
    const closureErrorText = `${closureError.message ?? ""} ${closureError.details ?? ""}`.toLowerCase();
    const isNoRowError =
      closureError.code === "PGRST116" &&
      (closureErrorText.includes("0 rows") || closureErrorText.includes("no rows"));

    if (isNoRowError) {
      return NextResponse.json({ error: "No closure record found" }, { status: 404 });
    }

    console.error("Failed to fetch closure record", {
      dealId: params.id,
      userId: user.id,
      role: profile.role,
      error: closureError,
    });
    return NextResponse.json({ error: "Failed to fetch closure record" }, { status: 500 });
  }

  if (!closure) {
    return NextResponse.json({ error: "No closure record found" }, { status: 404 });
  }

  return NextResponse.json({ closure });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Buyer reports enterprise value
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

  // Fetch deal
  const { data: deal } = await supabase
    .from("deals")
    .select("id, status, firm_id")
    .eq("id", params.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (deal.status !== "closed") {
    return NextResponse.json({ error: "Deal must be in closed status" }, { status: 400 });
  }

  // Check engagement. Only the buyer with the winning closed engagement can report closure.
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, stage")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "No engagement found" }, { status: 400 });
  }

  if (engagement.stage !== "closed") {
    return NextResponse.json({ error: "Engagement is not eligible to report closure" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = closeReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid enterprise value is required" }, { status: 400 });
  }

  const { enterpriseValue } = parsed.data;

  // Create deal_closures record
  const { data: closure, error } = await supabase
    .from("deal_closures")
    .insert({
      deal_id: params.id,
      engagement_id: engagement.id,
      buyer_user_id: user.id,
      buyer_firm_id: profile.firm_id,
      broker_firm_id: deal.firm_id,
      enterprise_value: enterpriseValue,
      buyer_confirmed: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create closure record" }, { status: 500 });
  }

  // Log activity
  await supabase.from("deal_activity_log").insert({
    deal_id: params.id,
    actor_id: user.id,
    action: "deal_closed",
    metadata: { engagement_id: engagement.id, enterprise_value: enterpriseValue },
  });

  notifyBroker("deal_closure_buyer_reported", params.id, engagement.id);

  return NextResponse.json({ closure }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Broker confirm or dispute
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

  // Verify broker owns this deal
  const { data: deal } = await supabase
    .from("deals")
    .select("id, firm_id")
    .eq("id", params.id)
    .eq("firm_id", profile.firm_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = closeActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { action, disputeDocumentsPath } = parsed.data;
  if (disputeDocumentsPath && !isValidStorageObjectKey(disputeDocumentsPath, { requirePdf: true, allowedPrefixes: [params.id] })) {
    return NextResponse.json({ error: "Dispute document path must be scoped to this deal" }, { status: 400 });
  }

  // Fetch existing closure
  const { data: closure } = await supabase
    .from("deal_closures")
    .select("*")
    .eq("deal_id", params.id)
    .single();

  if (!closure) {
    return NextResponse.json({ error: "No closure record found" }, { status: 404 });
  }

  const adminClient = createAdminClient();

  if (action === "confirm") {
    // Calculate fees
    const { successFee, brokerIncentive } = calculateFees(closure.enterprise_value);

    const { error } = await adminClient
      .from("deal_closures")
      .update({
        broker_confirmed: true,
        success_fee: successFee,
        broker_incentive: brokerIncentive,
      })
      .eq("id", closure.id);

    if (error) {
      return NextResponse.json({ error: "Failed to confirm closure" }, { status: 500 });
    }

    // Terminate all other engagements
    await adminClient
      .from("deal_engagements")
      .update({ stage: "terminated" })
      .eq("deal_id", params.id)
      .neq("id", closure.engagement_id)
      .not("stage", "in", '("terminated","passed","declined")');

    // Log activity
    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "deal_closed",
      metadata: {
        broker_confirmed: true,
        success_fee: successFee,
        broker_incentive: brokerIncentive,
      },
    });

    return NextResponse.json({
      success: true,
      success_fee: successFee,
      broker_incentive: brokerIncentive,
    });
  } else if (action === "dispute") {
    const { error } = await adminClient
      .from("deal_closures")
      .update({
        broker_disputed: true,
        dispute_documents_path: disputeDocumentsPath || null,
      })
      .eq("id", closure.id);

    if (error) {
      return NextResponse.json({ error: "Failed to record dispute" }, { status: 500 });
    }

    notifyAdmin("deal_closure_disputed", params.id);

    // Log activity
    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "deal_closure_disputed",
      metadata: { closure_id: closure.id },
    });

    return NextResponse.json({ success: true, disputed: true });
  }
}
