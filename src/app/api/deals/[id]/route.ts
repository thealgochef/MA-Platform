import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { dealCreateSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ deal });
}

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

    // Verify the deal belongs to the broker's firm
    const { data: existingDeal } = await supabase
      .from("deals")
      .select("firm_id")
      .eq("id", params.id)
      .single();

    if (!existingDeal || existingDeal.firm_id !== profile.firm_id) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = dealCreateSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    if (data.projectName !== undefined) updateData.project_name = data.projectName;
    if (data.headline !== undefined) updateData.headline = data.headline;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.geographyDisplay !== undefined) updateData.geography_display = data.geographyDisplay;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.region !== undefined) updateData.region = data.region;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.ndaType !== undefined) updateData.nda_type = data.ndaType;
    if (data.ndaDocumentPath !== undefined) updateData.nda_document_path = data.ndaDocumentPath;
    if (data.cimDocumentPath !== undefined) updateData.cim_document_path = data.cimDocumentPath;
    if (data.cimSharingPreference !== undefined) updateData.cim_sharing_preference = data.cimSharingPreference;
    if (data.ndaVettingPreference !== undefined) updateData.nda_vetting_preference = data.ndaVettingPreference;
    if (data.teaserDocumentPath !== undefined) updateData.teaser_document_path = data.teaserDocumentPath;
    if (data.pointOfContactId !== undefined) updateData.point_of_contact_id = data.pointOfContactId;
    if (data.ioiDueDate !== undefined) updateData.ioi_due_date = data.ioiDueDate;
    if (data.loiDueDate !== undefined) updateData.loi_due_date = data.loiDueDate;

    if (data.financials) {
      const f = data.financials;
      if (f.year1) {
        updateData.revenue_year_1 = f.year1.revenue ?? null;
        updateData.ebitda_year_1 = f.year1.ebitda ?? null;
      }
      if (f.year2) {
        updateData.revenue_year_2 = f.year2.revenue ?? null;
        updateData.ebitda_year_2 = f.year2.ebitda ?? null;
      }
      if (f.year3) {
        updateData.revenue_year_3 = f.year3.revenue ?? null;
        updateData.ebitda_year_3 = f.year3.ebitda ?? null;
      }
      if (f.projection) {
        updateData.revenue_projection = f.projection.revenue ?? null;
        updateData.ebitda_projection = f.projection.ebitda ?? null;
      }
      updateData.fiscal_year_labels = {
        year_1: f.year1?.label || "",
        year_2: f.year2?.label || "",
        year_3: f.year3?.label || "",
        projection: f.projection?.label || "",
      };
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
    }

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "deal_updated",
      metadata: { fields: Object.keys(updateData) },
    });

    return NextResponse.json({ deal });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
