import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch deal
  const { data: deal } = await supabase
    .from("deals")
    .select("id, status, cim_document_path")
    .eq("id", params.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Document access revoked for paused, terminated, or closed deals
  if (["paused", "terminated", "closed"].includes(deal.status)) {
    return NextResponse.json({ error: "Document access revoked — deal is " + deal.status }, { status: 403 });
  }

  // Fetch engagement to check CIM access
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, cim_released, cim_viewed_at, cim_downloaded_at")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement || !engagement.cim_released) {
    return NextResponse.json({ error: "CIM not released" }, { status: 403 });
  }

  // Track view event
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "download") {
    // Track download
    if (!engagement.cim_downloaded_at) {
      await supabase
        .from("deal_engagements")
        .update({ cim_downloaded_at: new Date().toISOString() })
        .eq("id", engagement.id);
    }

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "cim_downloaded",
      details: { engagement_id: engagement.id },
    });
  } else {
    // Track view
    if (!engagement.cim_viewed_at) {
      await supabase
        .from("deal_engagements")
        .update({ cim_viewed_at: new Date().toISOString() })
        .eq("id", engagement.id);
    }

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "cim_viewed",
      details: { engagement_id: engagement.id },
    });
  }

  return NextResponse.json({
    cimPath: deal.cim_document_path,
    engagement: {
      cim_released: engagement.cim_released,
      cim_viewed_at: engagement.cim_viewed_at,
      cim_downloaded_at: engagement.cim_downloaded_at,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Manual CIM release by broker
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify broker owns deal
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
  const { engagementId } = body;

  if (!engagementId) {
    return NextResponse.json({ error: "engagementId is required" }, { status: 400 });
  }

  // Set cim_released = true
  const { error } = await supabase
    .from("deal_engagements")
    .update({
      cim_released: true,
      cim_released_at: new Date().toISOString(),
    })
    .eq("id", engagementId)
    .eq("deal_id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to release CIM" }, { status: 500 });
  }

  await supabase.from("deal_activity_log").insert({
    deal_id: params.id,
    actor_id: user.id,
    action: "cim_released",
    details: { engagement_id: engagementId, manual: true },
  });

  return NextResponse.json({ success: true });
}
