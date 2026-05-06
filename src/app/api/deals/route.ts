import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { dealCreateSchema } from "@/lib/validators";
import { logDealActivity } from "@/server/activity-log";
import { mapDealCreateDataToDb } from "@/server/deals/mappers";

const DEAL_DOCUMENT_FIELDS = ["teaserDocumentPath", "cimDocumentPath", "ndaDocumentPath"] as const;
const BUYER_DEAL_LIST_SELECT = `
  id,
  headline,
  description,
  geography_display,
  state,
  region,
  industry,
  revenue_year_1,
  ebitda_year_1,
  revenue_year_2,
  ebitda_year_2,
  revenue_year_3,
  ebitda_year_3,
  revenue_projection,
  ebitda_projection,
  fiscal_year_labels,
  status,
  ioi_due_date,
  loi_due_date,
  published_at,
  created_at
`;

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
    .select(BUYER_DEAL_LIST_SELECT)
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const draftFirstMessage =
      "POST /api/deals creates drafts only. Create the draft, upload documents under the returned deal ID, PATCH document paths, then publish via the deal status endpoint.";

    const { publish, ...formData } = body;

    if (publish) {
      return NextResponse.json({ error: draftFirstMessage }, { status: 400 });
    }

    for (const field of DEAL_DOCUMENT_FIELDS) {
      if (field in body && body[field] !== null && body[field] !== undefined && body[field] !== "") {
        return NextResponse.json({ error: `${field} cannot be set during initial draft creation. ${draftFirstMessage}` }, { status: 400 });
      }
    }

    const validation = dealCreateSchema.safeParse(formData);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const dealData = mapDealCreateDataToDb(validation.data, {
      firmId: profile.firm_id,
      userId: user.id,
    });

    const { data: deal, error } = await supabase
      .from("deals")
      .insert(dealData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
    }

    await logDealActivity(supabase, {
      dealId: deal.id,
      actorId: user.id,
      action: "deal_created",
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
