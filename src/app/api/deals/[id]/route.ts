import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { dealCreateSchema, isValidStorageObjectKey } from "@/lib/validators";
import { logDealActivity } from "@/server/activity-log";
import { mapDealUpdateDataToDb } from "@/server/deals/mappers";

const DEAL_DOCUMENT_FIELDS = ["teaserDocumentPath", "cimDocumentPath", "ndaDocumentPath"] as const;
const BUYER_DEAL_DETAIL_SELECT = `
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
  closed_at,
  created_at
`;

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
    .select("role, status, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: brokerDeal } = profile.role === "broker"
    ? await supabase
      .from("deals")
      .select("*")
      .eq("id", params.id)
      .single()
    : { data: null };

  if (brokerDeal && brokerDeal.firm_id === profile.firm_id) {
    return NextResponse.json({ deal: brokerDeal });
  }

  if (profile.role === "broker") {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .select(BUYER_DEAL_DETAIL_SELECT)
    .eq("id", params.id)
    .neq("status", "draft")
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, stage, nda_status, cim_released")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ deal, engagement });
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = dealCreateSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    for (const field of DEAL_DOCUMENT_FIELDS) {
      const documentPath = data[field];
      if (documentPath && !isValidStorageObjectKey(documentPath, { requirePdf: true, allowedPrefixes: [params.id] })) {
        return NextResponse.json(
          { error: `${field} must be a PDF path scoped to this deal` },
          { status: 400 }
        );
      }
    }

    const updateData = mapDealUpdateDataToDb(data);

    const { data: deal, error } = await supabase
      .from("deals")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
    }

    await logDealActivity(supabase, {
      dealId: params.id,
      actorId: user.id,
      action: "deal_updated",
      metadata: { fields: Object.keys(updateData) },
    });

    return NextResponse.json({ deal });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("users")
      .select("role, status, firm_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "broker" || profile.status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: deal } = await adminClient
      .from("deals")
      .select("id, firm_id, teaser_document_path, cim_document_path, nda_document_path")
      .eq("id", params.id)
      .single();

    if (!deal || deal.firm_id !== profile.firm_id) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const { data: documents } = await adminClient
      .from("deal_documents")
      .select("file_path")
      .eq("deal_id", params.id);

    const storagePaths = [
      deal.teaser_document_path,
      deal.cim_document_path,
      deal.nda_document_path,
      ...(documents || []).map((document) => document.file_path),
    ].filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      await adminClient.storage.from("deal-documents").remove(storagePaths);
    }

    const { error: deleteError } = await adminClient
      .from("deals")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
