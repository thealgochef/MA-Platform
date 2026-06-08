import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ndaActionSchema } from "@/lib/validators";
import { SIGNED_NDA_ARTIFACT_CONSTRAINTS } from "@/lib/constants";

const NDA_AVAILABLE_STAGES = ["nda_pending", "pursued"] as const;

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
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "buyer" || profile.status !== "approved") {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  // Fetch deal NDA info
  const { data: deal } = await supabase
    .from("deals")
    .select("id, headline, nda_type, nda_document_path")
    .eq("id", params.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  if (deal.nda_type === "custom" && !deal.nda_document_path) {
    console.error("NDA unavailable: custom NDA is missing a document path", {
      dealId: params.id,
      buyerUserId: user.id,
    });
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  // Fetch engagement to verify buyer has access to NDA
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, stage, nda_status")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  const canSignOrDecline =
    NDA_AVAILABLE_STAGES.includes(engagement.stage) && engagement.nda_status === "sent";
  const canViewSigned = engagement.nda_status === "signed";

  if (!canSignOrDecline && !canViewSigned) {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  const serverDate = new Date().toISOString().split("T")[0];

  return NextResponse.json({ deal, engagement, serverDate });
}

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
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "buyer" || profile.status !== "approved") {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ndaActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "All signature fields are required" }, { status: 400 });
  }

  const { action } = parsed.data;

  // Fetch deal NDA metadata to verify NDA availability
  const { data: dealNdaMetadata } = await supabase
    .from("deals")
    .select("nda_type, nda_document_path")
    .eq("id", params.id)
    .single();

  if (!dealNdaMetadata) {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  if (dealNdaMetadata.nda_type === "custom" && !dealNdaMetadata.nda_document_path) {
    console.error("NDA unavailable: custom NDA is missing a document path", {
      dealId: params.id,
      buyerUserId: user.id,
    });
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  // Fetch engagement
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, stage, nda_status, deal_id")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  if (!NDA_AVAILABLE_STAGES.includes(engagement.stage) || engagement.nda_status !== "sent") {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  if (action === "decline") {
    // NDA decline — sets nda_status to declined, engagement stage to declined
    const { error } = await supabase
      .from("deal_engagements")
      .update({
        nda_status: "declined",
        stage: "declined",
      })
      .eq("id", engagement.id);

    if (error) {
      return NextResponse.json({ error: "Failed to decline NDA" }, { status: 500 });
    }

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "nda_declined",
      metadata: { engagement_id: engagement.id },
    });

    return NextResponse.json({ success: true, status: "declined" });
  }

  // Sign NDA
  const { signatureName, signatureTitle, signatureCompany } = parsed.data;
  const signatureDate = new Date().toISOString().split("T")[0];

  // Store signed NDA record in signed-ndas bucket
  const signedNdaData = JSON.stringify({
    dealId: params.id,
    buyerUserId: user.id,
    signatureName,
    signatureTitle,
    signatureCompany,
    signatureDate,
    signedAt: new Date().toISOString(),
  });

  const ndaPath = `${params.id}/${user.id}/${crypto.randomUUID()}${SIGNED_NDA_ARTIFACT_CONSTRAINTS.ALLOWED_EXTENSION}`;
  const { error: uploadError } = await supabase.storage
    .from("signed-ndas")
    .upload(ndaPath, signedNdaData, { contentType: SIGNED_NDA_ARTIFACT_CONSTRAINTS.ALLOWED_TYPE });

  if (uploadError) {
    console.error("Failed to upload signed NDA artifact", {
      dealId: params.id,
      buyerUserId: user.id,
      error: uploadError.message,
    });
    return NextResponse.json({ error: "Failed to store signed NDA" }, { status: 500 });
  }

  // Fetch deal to check cim_sharing_preference
  const { data: deal } = await supabase
    .from("deals")
    .select("cim_sharing_preference")
    .eq("id", params.id)
    .single();

  // Update engagement: nda_status = signed, stage = nda_signed, nda_signed_at = now
  const updateData: Record<string, unknown> = {
    nda_status: "signed",
    stage: "nda_signed",
    nda_signed_at: new Date().toISOString(),
    nda_document_path: ndaPath,
  };

  // Auto CIM release if deal has cim_sharing_preference = 'auto'
  if (deal?.cim_sharing_preference === "auto") {
    updateData.cim_released = true;
    updateData.cim_released_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("deal_engagements")
    .update(updateData)
    .eq("id", engagement.id);

  if (error) {
    const adminClient = createAdminClient();
    const { error: removeError } = await adminClient.storage
      .from("signed-ndas")
      .remove([ndaPath]);

    if (removeError) {
      console.error("Failed to remove orphaned signed NDA artifact", {
        dealId: params.id,
        buyerUserId: user.id,
        path: ndaPath,
        error: removeError.message,
      });
    }

    return NextResponse.json({ error: "Failed to sign NDA" }, { status: 500 });
  }

  // Log activity: nda_signed
  await supabase.from("deal_activity_log").insert({
    deal_id: params.id,
    actor_id: user.id,
    action: "nda_signed",
    metadata: {
      engagement_id: engagement.id,
      cim_released: deal?.cim_sharing_preference === "auto",
    },
  });

  return NextResponse.json({
    success: true,
    status: "signed",
    cimReleased: deal?.cim_sharing_preference === "auto",
  });
}
