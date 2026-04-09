import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { loiSubmitSchema } from "@/lib/validators";
import { notifyBroker } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch LOIs for this deal by the current buyer
  const { data: lois } = await supabase
    .from("lois")
    .select("*")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .order("submitted_at", { ascending: false });

  return NextResponse.json({ lois: lois || [] });
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
    .select("role, status, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "buyer" || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch deal and check status
  const { data: deal } = await supabase
    .from("deals")
    .select("id, status")
    .eq("id", params.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (deal.status !== "accepting_lois") {
    return NextResponse.json({ error: "Deal is not accepting LOIs" }, { status: 400 });
  }

  // Check engagement — buyer must have IOI submitted
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, stage, nda_status")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "No engagement found" }, { status: 400 });
  }

  if (engagement.stage !== "ioi_submitted" && engagement.stage !== "loi_submitted") {
    return NextResponse.json({ error: "IOI must be submitted before submitting LOI" }, { status: 400 });
  }

  // Parse and validate body
  const body = await request.json();
  const parsed = loiSubmitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Insert LOI
  const { data: loi, error } = await supabase
    .from("lois")
    .insert({
      deal_id: params.id,
      engagement_id: engagement.id,
      buyer_user_id: user.id,
      buyer_firm_id: profile.firm_id,
      offer_price: data.offerPrice,
      multiple: data.multiple,
      escrow: data.escrow,
      timing: data.timing,
      earnout: data.earnout,
      rollover: data.rollover,
      working_capital_peg: data.workingCapitalPeg,
      cash_at_close: data.cashAtClose,
      is_platform: data.isPlatform,
      is_addon: data.isAddon,
      addon_platform_url: data.addonPlatformUrl || null,
      special_considerations: data.specialConsiderations || null,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit LOI" }, { status: 500 });
  }

  // Update engagement stage to loi_submitted
  await supabase
    .from("deal_engagements")
    .update({ stage: "loi_submitted" })
    .eq("id", engagement.id);

  // Log activity
  await supabase.from("deal_activity_log").insert({
    deal_id: params.id,
    actor_id: user.id,
    action: "loi_submitted",
    metadata: { engagement_id: engagement.id, loi_id: loi.id },
  });

  notifyBroker("loi_submitted", params.id, engagement.id);

  return NextResponse.json({ loi }, { status: 201 });
}
