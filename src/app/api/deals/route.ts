import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { dealCreateSchema } from "@/lib/validators";

export async function GET() {
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

  if (!profile || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (profile.role === "broker") {
    // Brokers see their firm's deals (including drafts)
    const { data: deals, error } = await supabase
      .from("deals")
      .select("*")
      .eq("firm_id", profile.firm_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
    }
    return NextResponse.json({ deals: deals || [] });
  }

  // Buyers see only active deals (non-draft)
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
  return NextResponse.json({ deals: deals || [] });
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Only approved brokers can create deals" }, { status: 403 });
    }

    const body = await request.json();
    const { publish, ...formData } = body;
    const validation = dealCreateSchema.safeParse(formData);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const dealData: Record<string, unknown> = {
      firm_id: profile.firm_id,
      created_by: user.id,
      point_of_contact_id: data.pointOfContactId || user.id,
      project_name: data.projectName,
      headline: data.headline,
      description: data.description,
      geography_display: data.geographyDisplay,
      state: data.state || null,
      region: data.region || null,
      industry: data.industry,
      nda_type: data.ndaType,
      nda_document_path: data.ndaDocumentPath || null,
      cim_document_path: data.cimDocumentPath || null,
      cim_sharing_preference: data.cimSharingPreference,
      nda_vetting_preference: data.ndaVettingPreference,
      teaser_document_path: data.teaserDocumentPath || null,
      ioi_due_date: data.ioiDueDate || null,
      loi_due_date: data.loiDueDate || null,
      status: "draft",
    };

    // Map financials
    if (data.financials) {
      const f = data.financials;
      dealData.revenue_year_1 = f.year1?.revenue ?? null;
      dealData.ebitda_year_1 = f.year1?.ebitda ?? null;
      dealData.revenue_year_2 = f.year2?.revenue ?? null;
      dealData.ebitda_year_2 = f.year2?.ebitda ?? null;
      dealData.revenue_year_3 = f.year3?.revenue ?? null;
      dealData.ebitda_year_3 = f.year3?.ebitda ?? null;
      dealData.revenue_projection = f.projection?.revenue ?? null;
      dealData.ebitda_projection = f.projection?.ebitda ?? null;
      dealData.fiscal_year_labels = {
        year_1: f.year1?.label || "",
        year_2: f.year2?.label || "",
        year_3: f.year3?.label || "",
        projection: f.projection?.label || "",
      };
    }

    // If publishing, validate CIM and teaser
    if (publish) {
      if (!dealData.cim_document_path) {
        return NextResponse.json({ error: "CIM is required to publish" }, { status: 400 });
      }
      if (!dealData.teaser_document_path) {
        return NextResponse.json({ error: "Teaser is required to publish" }, { status: 400 });
      }
      dealData.status = "accepting_iois";
      dealData.published_at = new Date().toISOString();
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .insert(dealData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
    }

    // Log activity
    if (publish) {
      await supabase.from("deal_activity_log").insert({
        deal_id: deal.id,
        actor_id: user.id,
        action: "deal_published",
        metadata: {},
      });
    } else {
      await supabase.from("deal_activity_log").insert({
        deal_id: deal.id,
        actor_id: user.id,
        action: "deal_created",
        metadata: {},
      });
    }

    return NextResponse.json({ deal }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
