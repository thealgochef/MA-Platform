import { NextResponse } from "next/server";
import { matchDealsToProject, type MatchCriteria, type DealForMatching } from "@/lib/matching";
import { escapePostgrestLikePattern } from "@/lib/validators";
import { ACTIVE_DEAL_STATUSES } from "@/lib/constants";
import { isAuthResponse, requireRole } from "@/server/auth";

const PAGE_SIZE = 20;
const FETCH_BATCH_SIZE = 100;
const MAX_SCAN_BATCHES = 50;
const MAX_SCANNED_ROWS = FETCH_BATCH_SIZE * MAX_SCAN_BATCHES;
const MAX_CANONICAL_KEYWORDS = 20;
const MAX_KEYWORD_TOKEN_LENGTH = 64;
const DEAL_SELECT_FIELDS = "id, headline, description, industry, state, region, geography_display, status, revenue_year_1, ebitda_year_1, revenue_year_2, ebitda_year_2, revenue_year_3, ebitda_year_3, revenue_projection, ebitda_projection, fiscal_year_labels, nda_type, cim_sharing_preference, nda_vetting_preference, teaser_document_path, cim_document_path, nda_document_path, ioi_due_date, loi_due_date, published_at, closed_at, created_at";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEYWORD_SPLIT_REGEX = /[(),]+/;

type DealRow = {
  id: string;
  headline: string;
  description: string;
  industry: string;
  state: string | null;
  region: string | null;
  geography_display: string | null;
  status: string;
  revenue_year_1: number | null;
  ebitda_year_1: number | null;
  revenue_year_2: number | null;
  ebitda_year_2: number | null;
  revenue_year_3: number | null;
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
  deal_id: string;
  stage: string | null;
  nda_status: string | null;
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
};

function buildKeywordOrFilter(keywords?: string[]) {
  if (!keywords || keywords.length === 0) {
    return null;
  }

  const clauses: string[] = [];
  for (const keyword of keywords) {
    const escapedKeyword = escapePostgrestLikePattern(keyword);
    clauses.push(`headline.ilike.%${escapedKeyword}%`);
    clauses.push(`description.ilike.%${escapedKeyword}%`);
  }

  return clauses.length > 0 ? clauses.join(",") : null;
}

function buildCanonicalKeywords(keywords: string[] | null | undefined): string[] | undefined {
  if (!keywords || keywords.length === 0) {
    return undefined;
  }

  const canonical: string[] = [];

  for (const keyword of keywords) {
    const segments = keyword.split(KEYWORD_SPLIT_REGEX);
    for (const segment of segments) {
      if (canonical.length >= MAX_CANONICAL_KEYWORDS) {
        break;
      }

      const normalizedToken = segment.trim().replace(/\s+/g, " ");
      if (normalizedToken.length === 0 || normalizedToken.length > MAX_KEYWORD_TOKEN_LENGTH) {
        continue;
      }

      canonical.push(normalizedToken);
    }

    if (canonical.length >= MAX_CANONICAL_KEYWORDS) {
      break;
    }
  }

  return canonical.length > 0 ? canonical : undefined;
}

function toDealForMatching(deal: DealRow): DealForMatching {
  return {
    id: deal.id,
    industry: deal.industry,
    state: deal.state || undefined,
    region: deal.region || undefined,
    revenueYear3: deal.revenue_year_3 ?? undefined,
    ebitdaYear3: deal.ebitda_year_3 ?? undefined,
    headline: deal.headline,
    description: deal.description,
    status: deal.status,
  };
}

function parseCursor(cursor: string | null): { value: string | null; isInvalid: boolean } {
  if (!cursor) {
    return { value: null, isInvalid: false };
  }

  if (!UUID_REGEX.test(cursor)) {
    return { value: null, isInvalid: true };
  }

  return { value: cursor, isInvalid: false };
}

function buildBuyerMatchResponseDeal(deal: DealRow, engagement: EngagementRow | null) {
  const {
    teaser_document_path: teaserDocumentPath,
    cim_document_path: cimDocumentPath,
    nda_document_path: ndaDocumentPath,
    created_at: createdAt,
    ...safeDealFields
  } = deal;

  const ndaHasBeenSentOrSigned = engagement?.nda_status === "sent" || engagement?.nda_status === "signed";
  const buyerHasCimAccess = engagement?.nda_status === "signed" && engagement?.cim_released === true;

  return {
    ...safeDealFields,
    date_received: createdAt,
    has_teaser_document: Boolean(teaserDocumentPath),
    has_nda_document: deal.nda_type === "custom" && Boolean(ndaDocumentPath) && ndaHasBeenSentOrSigned,
    has_cim_document: Boolean(cimDocumentPath) && buyerHasCimAccess,
    engagement,
  };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;
  const { supabase, user, profile } = context;
  const isApprovedBuyer = profile.role === "buyer" && profile.status === "approved";

  // Fetch the project and verify ownership
  const { data: project, error: projectError } = await supabase
    .from("buyer_projects")
    .select("*")
    .eq("id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (projectError) {
    if (projectError.code === "PGRST116") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.error("Failed to fetch buyer project for matches", {
      projectId: params.id,
      userId: user.id,
      error: projectError,
    });

    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Parse cursor for keyset pagination
  const url = new URL(request.url);
  const parsedCursor = parseCursor(url.searchParams.get("cursor"));
  if (parsedCursor.isInvalid) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }
  const cursor = parsedCursor.value;

  if (project.is_active !== true) {
    let engagementQuery = supabase
      .from("deal_engagements")
      .select("id, deal_id, stage, nda_status, nda_signed_at, cim_released, cim_released_at, cim_viewed_at, cim_downloaded_at, pass_reason, pass_reason_detail, declined_at, vetting_status, vetting_rejection_reason")
      .eq("buyer_user_id", user.id)
      .eq("project_id", params.id)
      .order("deal_id", { ascending: true })
      .limit(PAGE_SIZE + 1);

    if (cursor) {
      engagementQuery = engagementQuery.gt("deal_id", cursor);
    }

    const { data: engagementRows, error: engagementError } = await engagementQuery;
    if (engagementError) {
      console.error("Failed to fetch inactive project engagements", {
        projectId: params.id,
        userId: user.id,
        error: engagementError,
      });
      return NextResponse.json({ error: "Failed to fetch deal engagements" }, { status: 500 });
    }

    const allEngagements = (engagementRows || []) as EngagementRow[];
    const pageEngagements = allEngagements.slice(0, PAGE_SIZE);
    const pageDealIds = pageEngagements.map((engagement) => engagement.deal_id);

    let deals: DealRow[] = [];
    if (pageDealIds.length > 0) {
      const { data: dealRows, error: dealsError } = await supabase
        .from("deals")
        .select(DEAL_SELECT_FIELDS)
        .in("id", pageDealIds);

      if (dealsError) {
        console.error("Failed to fetch deals for inactive project engagements", {
          projectId: params.id,
          userId: user.id,
          error: dealsError,
        });
        return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
      }

      deals = (dealRows || []) as DealRow[];
    }

    const dealsById = new Map(deals.map((deal) => [deal.id, deal]));
    const results = pageEngagements
      .map((engagement) => {
        const deal = dealsById.get(engagement.deal_id);
        if (!deal) {
          return null;
        }
        return buildBuyerMatchResponseDeal(deal, engagement);
      })
      .filter((deal): deal is ReturnType<typeof buildBuyerMatchResponseDeal> => deal !== null);

    const nextCursor = allEngagements.length > PAGE_SIZE
      ? pageEngagements[pageEngagements.length - 1]?.deal_id ?? null
      : null;

    return NextResponse.json({
      deals: results,
      nextCursor,
      viewer: {
        isApprovedBuyer,
      },
    });
  }

  const canonicalKeywords = buildCanonicalKeywords(project.keywords);

  // Build match criteria from project
  const criteria: MatchCriteria = {
    industry: project.industry || undefined,
    revenueMin: project.revenue_min ?? undefined,
    revenueMax: project.revenue_max ?? undefined,
    ebitdaMin: project.ebitda_min ?? undefined,
    ebitdaMax: project.ebitda_max ?? undefined,
    ebitdaMargin: project.ebitda_margin ?? undefined,
    location: project.location || undefined,
    keywords: canonicalKeywords,
  };

  const keywordOrFilter = buildKeywordOrFilter(canonicalKeywords);

  const matchedDeals: DealRow[] = [];
  let sourceCursor = cursor;
  let exhausted = false;
  let scannedBatches = 0;
  let scannedRows = 0;

  while (
    matchedDeals.length < PAGE_SIZE + 1 &&
    !exhausted &&
    scannedBatches < MAX_SCAN_BATCHES &&
    scannedRows < MAX_SCANNED_ROWS
  ) {
    let query = supabase
      .from("deals")
      .select(DEAL_SELECT_FIELDS)
      .in("status", ACTIVE_DEAL_STATUSES)
      .order("id", { ascending: true })
      .limit(FETCH_BATCH_SIZE);

    if (sourceCursor) {
      query = query.gt("id", sourceCursor);
    }
    if (criteria.industry) {
      query = query.eq("industry", criteria.industry);
    }
    if (criteria.location) {
      query = query.eq("state", criteria.location);
    }
    if (keywordOrFilter) {
      query = query.or(keywordOrFilter);
    }

    const { data: dealBatch, error: dealBatchError } = await query;
    if (dealBatchError) {
      console.error("Failed to fetch project match deal batch", {
        projectId: params.id,
        userId: user.id,
        error: dealBatchError,
      });
      return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
    }

    const typedBatch = (dealBatch || []) as DealRow[];
    scannedBatches += 1;
    scannedRows += typedBatch.length;

    if (typedBatch.length === 0) {
      exhausted = true;
      break;
    }

    sourceCursor = typedBatch[typedBatch.length - 1].id;

    const matchedInBatch = matchDealsToProject(
      typedBatch.map((deal) => toDealForMatching(deal)),
      criteria
    );
    const matchedIds = new Set(matchedInBatch.map((deal) => deal.id));

    for (const deal of typedBatch) {
      if (matchedIds.has(deal.id)) {
        matchedDeals.push(deal);
        if (matchedDeals.length >= PAGE_SIZE + 1) {
          break;
        }
      }
    }

    if (typedBatch.length < FETCH_BATCH_SIZE) {
      exhausted = true;
    }
  }

  const pageDeals = matchedDeals.slice(0, PAGE_SIZE);
  const pageDealIds = pageDeals.map((deal) => deal.id);

  let engagements: EngagementRow[] = [];

  // Fetch existing engagements only for deals in this page
  if (pageDealIds.length > 0) {
    const { data: engagementRows, error: engagementsError } = await supabase
      .from("deal_engagements")
      .select("id, deal_id, stage, nda_status, nda_signed_at, cim_released, cim_released_at, cim_viewed_at, cim_downloaded_at, pass_reason, pass_reason_detail, declined_at, vetting_status, vetting_rejection_reason")
      .eq("buyer_user_id", user.id)
      .in("deal_id", pageDealIds);

    if (engagementsError) {
      console.error("Failed to fetch deal engagements for project matches", {
        projectId: params.id,
        userId: user.id,
        error: engagementsError,
      });
      return NextResponse.json({ error: "Failed to fetch deal engagements" }, { status: 500 });
    }

    engagements = engagementRows || [];
  }

  const engagementMap = new Map((engagements || []).map((engagement) => [engagement.deal_id, engagement]));
  const results = pageDeals.map((deal) => buildBuyerMatchResponseDeal(deal, engagementMap.get(deal.id) || null));

  const hitScanCap = !exhausted && (scannedBatches >= MAX_SCAN_BATCHES || scannedRows >= MAX_SCANNED_ROWS);
  const nextCursor = matchedDeals.length > PAGE_SIZE
    ? pageDeals[pageDeals.length - 1].id
    : hitScanCap
      ? sourceCursor
      : null;

  return NextResponse.json({
    deals: results,
    nextCursor,
    viewer: {
      isApprovedBuyer,
    },
  });
}
