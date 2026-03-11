import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { PASS_REASONS } from "@/lib/constants";
import { notifyBroker } from "@/lib/notifications";

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

  // Check engagement — must have NDA signed (post-NDA pass only)
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, stage, nda_status")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "No engagement found" }, { status: 400 });
  }

  if (engagement.nda_status !== "signed") {
    return NextResponse.json({ error: "Can only pass after NDA is signed" }, { status: 400 });
  }

  if (engagement.stage === "passed") {
    return NextResponse.json({ error: "Already passed on this deal" }, { status: 400 });
  }

  const body = await request.json();
  const { pass_reason, pass_reason_detail } = body;

  if (!pass_reason) {
    return NextResponse.json({ error: "Pass reason is required" }, { status: 400 });
  }

  // Validate pass reason is from PASS_REASONS
  const validReasons = PASS_REASONS as readonly string[];
  if (!validReasons.includes(pass_reason)) {
    return NextResponse.json({ error: "Invalid pass reason" }, { status: 400 });
  }

  // If reason is "Other", detail is required
  if (pass_reason === "Other" && !pass_reason_detail) {
    return NextResponse.json({ error: "Detail is required when reason is Other" }, { status: 400 });
  }

  // Set engagement to passed — this is final, no re-engagement
  const { error } = await supabase
    .from("deal_engagements")
    .update({
      stage: "passed",
      pass_reason,
      pass_reason_detail: pass_reason_detail || null,
    })
    .eq("id", engagement.id);

  if (error) {
    return NextResponse.json({ error: "Failed to record pass" }, { status: 500 });
  }

  // Log activity
  await supabase.from("deal_activity_log").insert({
    deal_id: params.id,
    actor_id: user.id,
    action: "buyer_passed",
    details: {
      engagement_id: engagement.id,
      pass_reason,
      pass_reason_detail: pass_reason_detail || null,
    },
  });

  notifyBroker("buyer_passed", params.id, engagement.id);

  return NextResponse.json({ success: true });
}
