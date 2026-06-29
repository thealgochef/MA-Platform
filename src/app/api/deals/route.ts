import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { dealCreateSchema } from "@/lib/validators";
import { logDealActivity } from "@/server/activity-log";
import { mapDealCreateDataToDb } from "@/server/deals/mappers";
import type {
  CimSharingPreference,
  EngagementStage,
  NdaVettingPreference,
  PendingActionType,
} from "@/types";

const DEAL_DOCUMENT_FIELDS = ["teaserDocumentPath", "cimDocumentPath", "ndaDocumentPath"] as const;
const MANUAL_REVIEW_PREFERENCE: CimSharingPreference & NdaVettingPreference = "manual";
const NDA_PENDING_STAGE: EngagementStage = "nda_pending";
const NDA_SIGNED_STAGE: EngagementStage = "nda_signed";
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

type BrokerDealListRow = {
  id: string;
  project_name: string;
  headline: string;
  status: string;
  industry: string;
  view_count: number;
  published_at: string | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  nda_vetting_preference: NdaVettingPreference | null;
  cim_sharing_preference: CimSharingPreference | null;
};

type BrokerDealEngagementStageRow = {
  deal_id: string;
  stage: EngagementStage | null;
};

type BrokerPendingActionType = PendingActionType | null;

function isBrokerDealListRow(value: unknown): value is BrokerDealListRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === "string" &&
    typeof row.project_name === "string" &&
    typeof row.headline === "string" &&
    typeof row.status === "string" &&
    typeof row.industry === "string" &&
    typeof row.view_count === "number" &&
    (row.published_at === null || typeof row.published_at === "string") &&
    (row.revenue_year_3 === null || typeof row.revenue_year_3 === "number") &&
    (row.ebitda_year_3 === null || typeof row.ebitda_year_3 === "number") &&
    (row.nda_vetting_preference === null ||
      row.nda_vetting_preference === "auto" ||
      row.nda_vetting_preference === "manual") &&
    (row.cim_sharing_preference === null ||
      row.cim_sharing_preference === "auto" ||
      row.cim_sharing_preference === "manual")
  );
}

function isBrokerDealEngagementStageRow(value: unknown): value is BrokerDealEngagementStageRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.deal_id === "string" &&
    (row.stage === null || row.stage === NDA_PENDING_STAGE || row.stage === NDA_SIGNED_STAGE)
  );
}

function parseBrokerDealRows(value: unknown): BrokerDealListRow[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.every(isBrokerDealListRow)) {
    return value;
  }

  return null;
}

function parseBrokerDealEngagementRows(value: unknown): BrokerDealEngagementStageRow[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.every(isBrokerDealEngagementStageRow)) {
    return value;
  }

  return null;
}

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

  if (profile.role !== "broker" && profile.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (profile.role === "broker") {
    // Brokers see their firm's deals (including drafts)
    const { data: deals, error } = await supabase
      .from("deals")
      .select(`
        id,
        project_name,
        headline,
        status,
        industry,
        view_count,
        published_at,
        revenue_year_3,
        ebitda_year_3,
        nda_vetting_preference,
        cim_sharing_preference
      `)
      .eq("firm_id", profile.firm_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
    }

    const brokerDeals = parseBrokerDealRows(deals ?? []);
    if (!brokerDeals) {
      console.error("GET /api/deals returned unexpected broker deal row shape", {
        userId: user.id,
      });
      return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
    }

    const dealIds = brokerDeals.map((deal) => deal.id);
    const dealIdsWithNdaPending = new Set<string>();
    const dealIdsWithNdaSigned = new Set<string>();

    if (dealIds.length > 0) {
      const { data: engagementStages, error: engagementError } = await supabase
        .from("deal_engagements")
        .select("deal_id, stage")
        .in("deal_id", dealIds)
        .in("stage", [NDA_PENDING_STAGE, NDA_SIGNED_STAGE]);

      if (engagementError) {
        return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
      }

      const parsedEngagementStages = parseBrokerDealEngagementRows(engagementStages ?? []);
      if (!parsedEngagementStages) {
        console.error("GET /api/deals returned unexpected engagement row shape", {
          userId: user.id,
        });
        return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
      }

      for (const engagement of parsedEngagementStages) {
        if (engagement.stage === NDA_PENDING_STAGE) {
          dealIdsWithNdaPending.add(engagement.deal_id);
        }

        if (engagement.stage === NDA_SIGNED_STAGE) {
          dealIdsWithNdaSigned.add(engagement.deal_id);
        }
      }
    }

    const dealsWithPendingActions = brokerDeals.map((deal) => {
      const hasManualNdaPendingAction =
        deal.nda_vetting_preference === MANUAL_REVIEW_PREFERENCE &&
        dealIdsWithNdaPending.has(deal.id);
      const hasManualCimPendingAction =
        deal.cim_sharing_preference === MANUAL_REVIEW_PREFERENCE &&
        dealIdsWithNdaSigned.has(deal.id);
      let pendingActionType: BrokerPendingActionType = null;

      if (hasManualNdaPendingAction) {
        pendingActionType = "release_nda";
      } else if (hasManualCimPendingAction) {
        pendingActionType = "release_cim";
      }

      return {
        ...deal,
        has_pending_actions: pendingActionType !== null,
        pending_action_type: pendingActionType,
      };
    });

    return NextResponse.json({ deals: dealsWithPendingActions });
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
