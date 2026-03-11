import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get firm data
  let firm = null;
  if (profile.firm_id) {
    const { data: firmData } = await supabase
      .from("firms")
      .select("*")
      .eq("id", profile.firm_id)
      .single();
    firm = firmData;
  }

  return NextResponse.json({ profile, firm });
}

export async function PATCH(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Get current user profile
  const { data: profile } = await supabase
    .from("users")
    .select("role, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Update user fields
  const userUpdate: Record<string, unknown> = {};
  if (body.fullName !== undefined) userUpdate.full_name = body.fullName;
  if (body.title !== undefined) userUpdate.title = body.title;
  if (body.location !== undefined) userUpdate.location = body.location;
  if (body.industryFocus !== undefined) userUpdate.industry_focus = body.industryFocus;
  if (body.licenseCredentials !== undefined) userUpdate.license_credentials = body.licenseCredentials;
  if (body.dealTypes !== undefined) userUpdate.deal_types = body.dealTypes;
  if (body.buyerType !== undefined) userUpdate.buyer_type = body.buyerType;
  if (body.aum !== undefined) userUpdate.aum = body.aum;

  if (Object.keys(userUpdate).length > 0) {
    const { error: userError } = await supabase
      .from("users")
      .update(userUpdate)
      .eq("id", user.id);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }
  }

  // Update firm fields
  if (profile.firm_id) {
    const firmUpdate: Record<string, unknown> = {};
    if (body.firmName !== undefined) firmUpdate.name = body.firmName;
    if (body.description !== undefined) firmUpdate.description = body.description;
    if (body.website !== undefined) firmUpdate.website = body.website;
    if (body.firmLocation !== undefined) firmUpdate.location = body.firmLocation;
    if (body.firmIndustryFocus !== undefined) firmUpdate.industry_focus = body.firmIndustryFocus;

    if (Object.keys(firmUpdate).length > 0) {
      const { error: firmError } = await supabase
        .from("firms")
        .update(firmUpdate)
        .eq("id", profile.firm_id);

      if (firmError) {
        return NextResponse.json({ error: firmError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}
