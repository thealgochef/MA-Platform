import { NextResponse } from "next/server";
import { isAuthResponse, requireRole } from "@/server/auth";

export const dynamic = "force-dynamic";

type DealSummaryRow = {
  id: string;
  headline: string;
  description: string | null;
  industry: string;
  state: string | null;
  region: string | null;
  geography_display: string | null;
  status: string;
  revenue_year_1: number | null;
  ebitda_year_1: number | null;
  revenue_year_2: number | null;
  revenue_year_3: number | null;
  ebitda_year_2: number | null;
  ebitda_year_3: number | null;
  revenue_projection: number | null;
  ebitda_projection: number | null;
  fiscal_year_labels: Record<string, string> | null;
  nda_type: string | null;
  cim_sharing_preference: string | null;
  nda_vetting_preference: string | null;
  teaser_document_path: string | null;
  cim_document_path: string | null;
  nda_document_path: string | null;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
};

type EngagementRow = {
  id: string;
  stage: string;
  nda_status: string;
  nda_signed_at: string | null;
  cim_released: boolean | null;
  cim_released_at: string | null;
  cim_viewed_at: string | null;
  cim_downloaded_at: string | null;
  pass_reason: string | null;
  pass_reason_detail: string | null;
  declined_at: string | null;
  vetting_status: string | null;
  vetting_rejection_reason: string | null;
  created_at: string;
  updated_at: string | null;
  project_id: string | null;
  deals: DealSummaryRow;
};

type EngagementRowWithNestedDeals = Omit<EngagementRow, "deals"> & {
  deals: unknown;
};

type SkippedEngagementReason = "missing_related_deal" | "invalid_related_deal_shape";

type BuyerProjectRow = {
  id: string;
  name: string;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

const CUSTOM_NDA_ACCESSIBLE_STATUSES = new Set(["sent", "signed"]);
const MALFORMED_ENGAGEMENT_WARN_THRESHOLD = 3;

const REQUIRED_DEAL_STRING_FIELDS = ["id", "headline", "industry", "status", "created_at"] as const;
const NULLABLE_DEAL_STRING_FIELDS = [
  "description",
  "state",
  "region",
  "geography_display",
  "nda_type",
  "cim_sharing_preference",
  "nda_vetting_preference",
  "teaser_document_path",
  "cim_document_path",
  "nda_document_path",
  "ioi_due_date",
  "loi_due_date",
  "published_at",
  "closed_at",
] as const;
const NULLABLE_DEAL_NUMBER_FIELDS = [
  "revenue_year_1",
  "ebitda_year_1",
  "revenue_year_2",
  "revenue_year_3",
  "ebitda_year_2",
  "ebitda_year_3",
  "revenue_projection",
  "ebitda_projection",
] as const;

function hasOwnProperty<T extends string>(value: Record<string, unknown>, key: T): value is Record<T, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isNullableFiscalYearLabels(value: unknown): value is Record<string, string> | null {
  if (value === null) return true;
  return isPlainObject(value) && Object.values(value).every((label) => typeof label === "string");
}

function isDealSummaryRowShape(value: unknown): value is DealSummaryRow {
  if (!isPlainObject(value)) return false;

  for (const field of REQUIRED_DEAL_STRING_FIELDS) {
    if (!hasOwnProperty(value, field) || typeof value[field] !== "string" || value[field].length === 0) {
      return false;
    }
  }

  for (const field of NULLABLE_DEAL_STRING_FIELDS) {
    if (!hasOwnProperty(value, field) || !isNullableString(value[field])) {
      return false;
    }
  }

  for (const field of NULLABLE_DEAL_NUMBER_FIELDS) {
    if (!hasOwnProperty(value, field) || !isNullableNumber(value[field])) {
      return false;
    }
  }

  return hasOwnProperty(value, "fiscal_year_labels") && isNullableFiscalYearLabels(value.fiscal_year_labels);
}

function getActivityTimestamp(engagement: Pick<EngagementRow, "updated_at" | "created_at">): number {
  const raw = engagement.updated_at ?? engagement.created_at;
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildBuyerEngagementResponseDeal(deal: DealSummaryRow, engagement: EngagementRow) {
  const ndaHasBeenSentOrSigned = CUSTOM_NDA_ACCESSIBLE_STATUSES.has(engagement.nda_status);
  const buyerHasCimAccess = engagement.nda_status === "signed" && engagement.cim_released === true;

  return {
    id: deal.id,
    headline: deal.headline,
    description: deal.description ?? null,
    industry: deal.industry,
    state: deal.state ?? null,
    region: deal.region ?? null,
    geography_display: deal.geography_display ?? null,
    status: deal.status,
    revenue_year_1: deal.revenue_year_1 ?? null,
    ebitda_year_1: deal.ebitda_year_1 ?? null,
    revenue_year_2: deal.revenue_year_2 ?? null,
    ebitda_year_2: deal.ebitda_year_2 ?? null,
    revenue_year_3: deal.revenue_year_3 ?? null,
    ebitda_year_3: deal.ebitda_year_3 ?? null,
    revenue_projection: deal.revenue_projection ?? null,
    ebitda_projection: deal.ebitda_projection ?? null,
    fiscal_year_labels: deal.fiscal_year_labels ?? null,
    nda_type: deal.nda_type ?? null,
    cim_sharing_preference: deal.cim_sharing_preference ?? null,
    nda_vetting_preference: deal.nda_vetting_preference ?? null,
    has_teaser_document: Boolean(deal.teaser_document_path),
    has_nda_document: deal.nda_type === "custom" && Boolean(deal.nda_document_path) && ndaHasBeenSentOrSigned,
    has_cim_document: Boolean(deal.cim_document_path) && buyerHasCimAccess,
    ioi_due_date: deal.ioi_due_date ?? null,
    loi_due_date: deal.loi_due_date ?? null,
    published_at: deal.published_at ?? null,
    closed_at: deal.closed_at ?? null,
    created_at: deal.created_at,
    date_received: deal.created_at,
    geography: deal.geography_display === "state" ? deal.state : deal.region,
  };
}

function redactIdentifier(identifier: string): string {
  if (identifier.length <= 2) return "**";
  if (identifier.length <= 8) return `${identifier.slice(0, 1)}***${identifier.slice(-1)}`;
  return `${identifier.slice(0, 4)}…${identifier.slice(-4)}`;
}

function logMalformedEngagementNormalizationWarning({
  userId,
  totalRows,
  returnedRows,
  skippedMalformedEngagements,
  skippedByReason,
}: {
  userId: string;
  totalRows: number;
  returnedRows: number;
  skippedMalformedEngagements: number;
  skippedByReason: Record<SkippedEngagementReason, number>;
}): void {
  const context = {
    userId,
    totalRows,
    returnedRows,
    skippedMalformedEngagements,
    skippedByReason,
  };

  if (skippedMalformedEngagements >= MALFORMED_ENGAGEMENT_WARN_THRESHOLD) {
    console.warn("Skipped malformed buyer engagement rows during normalization", context);
    return;
  }

  console.info("Detected malformed buyer engagement rows during normalization (below warn threshold)", {
    ...context,
    warningThreshold: MALFORMED_ENGAGEMENT_WARN_THRESHOLD,
  });
}

function normalizeEngagementDeal(
  engagement: EngagementRowWithNestedDeals
): { engagement: EngagementRow | null; skippedReason: SkippedEngagementReason | null } {
  const dealCandidate = Array.isArray(engagement.deals)
    ? engagement.deals.length === 1
      ? engagement.deals[0]
      : null
    : engagement.deals;

  if (!dealCandidate) {
    return {
      engagement: null,
      skippedReason: "missing_related_deal",
    };
  }

  if (!isDealSummaryRowShape(dealCandidate)) {
    return {
      engagement: null,
      skippedReason: "invalid_related_deal_shape",
    };
  }

  return {
    engagement: {
      ...engagement,
      deals: dealCandidate,
    },
    skippedReason: null,
  };
}

export async function GET() {
  try {
    const context = await requireRole("buyer");
    if (isAuthResponse(context)) return context;

    const { supabase, user, profile } = context;
    const isApprovedBuyer = profile.role === "buyer" && profile.status === "approved";

    const { data: engagementRows, error: engagementsError } = await supabase
      .from("deal_engagements")
      .select(`
        id,
        stage,
        nda_status,
        nda_signed_at,
        cim_released,
        cim_released_at,
        cim_viewed_at,
        cim_downloaded_at,
        pass_reason,
        pass_reason_detail,
        declined_at,
        vetting_status,
        vetting_rejection_reason,
        created_at,
        updated_at,
        project_id,
        deals!inner (
          id,
          headline,
          description,
          industry,
          state,
          region,
          geography_display,
          status,
          revenue_year_1,
          ebitda_year_1,
          revenue_year_2,
          revenue_year_3,
          ebitda_year_2,
          ebitda_year_3,
          revenue_projection,
          ebitda_projection,
          fiscal_year_labels,
          nda_type,
          cim_sharing_preference,
          nda_vetting_preference,
          teaser_document_path,
          cim_document_path,
          nda_document_path,
          ioi_due_date,
          loi_due_date,
          published_at,
          closed_at,
          created_at
        )
      `)
      .eq("buyer_user_id", user.id);

    if (engagementsError) {
      console.error("Failed to fetch buyer engagements", {
        userId: redactIdentifier(user.id),
        error: engagementsError,
      });
      return NextResponse.json(
        { error: "Failed to fetch engagements" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const rawEngagements = (engagementRows || []) as EngagementRowWithNestedDeals[];
    const skippedByReason: Record<SkippedEngagementReason, number> = {
      missing_related_deal: 0,
      invalid_related_deal_shape: 0,
    };
    const engagements: EngagementRow[] = [];

    for (const engagement of rawEngagements) {
      const normalized = normalizeEngagementDeal(engagement);
      if (normalized.engagement) {
        engagements.push(normalized.engagement);
        continue;
      }

      if (normalized.skippedReason) {
        skippedByReason[normalized.skippedReason] += 1;
      }
    }

    const skippedMalformedEngagements = skippedByReason.missing_related_deal + skippedByReason.invalid_related_deal_shape;
    if (skippedMalformedEngagements > 0) {
      logMalformedEngagementNormalizationWarning({
        userId: redactIdentifier(user.id),
        totalRows: rawEngagements.length,
        returnedRows: engagements.length,
        skippedMalformedEngagements,
        skippedByReason,
      });
    }

    const projectIds = Array.from(
      new Set(engagements.map((engagement) => engagement.project_id).filter((id): id is string => Boolean(id)))
    );

    const projectNameById = new Map<string, string>();

    if (projectIds.length > 0) {
      const { data: buyerProjects, error: buyerProjectsError } = await supabase
        .from("buyer_projects")
        .select("id, name")
        .eq("buyer_user_id", user.id)
        .in("id", projectIds);

      if (buyerProjectsError) {
        console.error("Failed to fetch buyer projects for engagements", {
          userId: redactIdentifier(user.id),
          error: buyerProjectsError,
        });
        return NextResponse.json(
          { error: "Failed to fetch engagements" },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      for (const project of (buyerProjects || []) as BuyerProjectRow[]) {
        projectNameById.set(project.id, project.name);
      }
    }

    const responseEngagements = engagements
      .map((engagement) => {
        const hasOwnedProject = engagement.project_id ? projectNameById.has(engagement.project_id) : false;
        const ownedProjectName = hasOwnedProject && engagement.project_id
          ? (projectNameById.get(engagement.project_id) ?? null)
          : null;

        return {
          id: engagement.id,
          stage: engagement.stage,
          nda_status: engagement.nda_status,
          created_at: engagement.created_at,
          updated_at: engagement.updated_at,
          project_id: hasOwnedProject ? engagement.project_id : null,
          project_name: hasOwnedProject ? ownedProjectName : null,
          deal: buildBuyerEngagementResponseDeal(engagement.deals, engagement),
          engagement: {
            id: engagement.id,
            stage: engagement.stage,
            nda_status: engagement.nda_status,
            nda_signed_at: engagement.nda_signed_at,
            cim_released: engagement.cim_released,
            cim_released_at: engagement.cim_released_at,
            cim_viewed_at: engagement.cim_viewed_at,
            cim_downloaded_at: engagement.cim_downloaded_at,
            pass_reason: engagement.pass_reason,
            pass_reason_detail: engagement.pass_reason_detail,
            declined_at: engagement.declined_at,
            vetting_status: engagement.vetting_status,
            vetting_rejection_reason: engagement.vetting_rejection_reason,
            date_received: engagement.deals.created_at,
          },
        };
      })
      .sort((a, b) => getActivityTimestamp(b) - getActivityTimestamp(a));

    return NextResponse.json(
      {
        engagements: responseEngagements,
        meta: {
          partial_results: skippedMalformedEngagements > 0,
          skipped_malformed_engagements: skippedMalformedEngagements,
        },
        viewer: {
          isApprovedBuyer,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Unexpected error fetching buyer engagements", { error });
    return NextResponse.json(
      { error: "Failed to fetch engagements" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
