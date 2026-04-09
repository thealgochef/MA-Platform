import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ioiSubmitSchema } from "@/lib/validators";
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

  // Fetch IOIs for this deal by the current buyer
  const { data: iois } = await supabase
    .from("iois")
    .select("*")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .order("submitted_at", { ascending: false });

  return NextResponse.json({ iois: iois || [] });
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

  if (deal.status !== "accepting_iois") {
    return NextResponse.json({ error: "Deal is not accepting IOIs" }, { status: 400 });
  }

  // Check engagement — buyer must have NDA signed and CIM released
  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, nda_status, cim_released, stage")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "No engagement found" }, { status: 400 });
  }

  if (engagement.nda_status !== "signed") {
    return NextResponse.json({ error: "NDA must be signed before submitting IOI" }, { status: 400 });
  }

  if (!engagement.cim_released) {
    return NextResponse.json({ error: "CIM must be released before submitting IOI" }, { status: 400 });
  }

  // Parse and validate body
  const body = await request.json();
  const parsed = ioiSubmitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Insert IOI
  const { data: ioi, error } = await supabase
    .from("iois")
    .insert({
      deal_id: params.id,
      engagement_id: engagement.id,
      buyer_user_id: user.id,
      buyer_firm_id: profile.firm_id,
      offer_price: data.offerPrice,
      multiple: data.multiple,
      earnout: data.earnout,
      rollover: data.rollover,
      cash_at_close: data.cashAtClose,
      time_to_close: data.timeToClose,
      is_platform: data.isPlatform,
      is_addon: data.isAddon,
      addon_platform_url: data.addonPlatformUrl || null,
      escrow: data.escrow || null,
      working_capital_peg: data.workingCapitalPeg || null,
      special_considerations: data.specialConsiderations || null,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit IOI" }, { status: 500 });
  }

  // Update engagement stage to ioi_submitted
  await supabase
    .from("deal_engagements")
    .update({ stage: "ioi_submitted" })
    .eq("id", engagement.id);

  // Log activity
  await supabase.from("deal_activity_log").insert({
    deal_id: params.id,
    actor_id: user.id,
    action: "ioi_submitted",
    metadata: { engagement_id: engagement.id, ioi_id: ioi.id },
  });

  notifyBroker("ioi_submitted", params.id, engagement.id);

  return NextResponse.json({ ioi }, { status: 201 });
}
