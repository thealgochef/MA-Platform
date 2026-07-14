import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { GET } from "@/app/api/buyer/engagements/route";

function createSupabaseForEngagements({
  engagements,
  buyerProjects,
}: {
  engagements: Array<Record<string, unknown>>;
  buyerProjects: Array<{ id: string; name: string }>;
}) {
  const engagementsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: engagements, error: null }),
  };

  const buyerProjectsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: buyerProjects, error: null }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "deal_engagements") return engagementsQuery;
      if (table === "buyer_projects") return buyerProjectsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    engagementsQuery,
    buyerProjectsQuery,
  };
}

describe("GET /api/buyer/engagements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireRole.mockResolvedValue(authResponse);

    const response = await GET();

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
    expect(authMocks.requireRole).toHaveBeenCalledWith("buyer");
  });

  it("returns expanded engagement payload with drawer fields and buyer-scoped project names", async () => {
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-1",
          stage: "nda_pending",
          nda_status: "sent",
          nda_signed_at: "2026-01-04T00:00:00.000Z",
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: "approved",
          vetting_rejection_reason: null,
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
          project_id: "project-1",
          deals: {
            id: "deal-1",
            headline: "Alpha Tools",
            description: "Industrial services provider",
            industry: "Industrial",
            state: "TX",
            region: null,
            geography_display: "state",
            status: "accepting_iois",
            revenue_year_1: 100,
            ebitda_year_1: 10,
            revenue_year_2: 110,
            ebitda_year_2: 15,
            revenue_year_3: 120,
            ebitda_year_3: 20,
            revenue_projection: 140,
            ebitda_projection: 25,
            fiscal_year_labels: {
              year_1: "2023A",
              year_2: "2024A",
              year_3: "2025A",
              projection: "2026E",
            },
            nda_type: "custom",
            cim_sharing_preference: "manual",
            nda_vetting_preference: "auto",
            teaser_document_path: "deals/deal-1/teaser.pdf",
            cim_document_path: "deals/deal-1/cim.pdf",
            nda_document_path: "deals/deal-1/nda.pdf",
            ioi_due_date: "2026-03-15",
            loi_due_date: "2026-04-15",
            published_at: "2025-12-01T00:00:00.000Z",
            closed_at: null,
            created_at: "2025-11-15T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [{ id: "project-1", name: "Platform Build" }],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json();
    expect(payload).toMatchObject({
      meta: {
        partial_results: false,
        skipped_malformed_engagements: 0,
      },
      viewer: {
        isApprovedBuyer: true,
      },
      engagements: [
        {
          id: "eng-1",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
          project_id: "project-1",
          project_name: "Platform Build",
          deal: {
            id: "deal-1",
            headline: "Alpha Tools",
            description: "Industrial services provider",
            industry: "Industrial",
            state: "TX",
            region: null,
            geography_display: "state",
            status: "accepting_iois",
            revenue_year_1: 100,
            ebitda_year_1: 10,
            revenue_year_2: 110,
            ebitda_year_2: 15,
            revenue_year_3: 120,
            ebitda_year_3: 20,
            revenue_projection: 140,
            ebitda_projection: 25,
            fiscal_year_labels: {
              year_1: "2023A",
              year_2: "2024A",
              year_3: "2025A",
              projection: "2026E",
            },
            nda_type: "custom",
            cim_sharing_preference: "manual",
            nda_vetting_preference: "auto",
            has_teaser_document: true,
            has_cim_document: false,
            has_nda_document: true,
            ioi_due_date: "2026-03-15",
            loi_due_date: "2026-04-15",
            published_at: "2025-12-01T00:00:00.000Z",
            closed_at: null,
            created_at: "2025-11-15T00:00:00.000Z",
            date_received: "2025-11-15T00:00:00.000Z",
            geography: "TX",
          },
          engagement: {
            id: "eng-1",
            stage: "nda_pending",
            nda_status: "sent",
            nda_signed_at: "2026-01-04T00:00:00.000Z",
            cim_released: false,
            cim_released_at: null,
            cim_viewed_at: null,
            cim_downloaded_at: null,
            pass_reason: null,
            pass_reason_detail: null,
            declined_at: null,
            vetting_status: "approved",
            vetting_rejection_reason: null,
            date_received: "2025-11-15T00:00:00.000Z",
          },
        },
      ],
    });

    const firstDeal = (payload.engagements as Array<{ deal: Record<string, unknown> }>)[0]?.deal;
    expect(firstDeal).not.toHaveProperty("teaser_document_path");
    expect(firstDeal).not.toHaveProperty("cim_document_path");
    expect(firstDeal).not.toHaveProperty("nda_document_path");

    expect(supabase.engagementsQuery.select).toHaveBeenCalled();
    expect(supabase.engagementsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(supabase.buyerProjectsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(supabase.buyerProjectsQuery.in).toHaveBeenCalledWith("id", ["project-1"]);
  });

  it("computes document availability booleans with match-route semantics", async () => {
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-custom-sent",
          stage: "nda_pending",
          nda_status: "sent",
          nda_signed_at: null,
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {
            id: "deal-sent",
            headline: "Sent NDA Deal",
            description: null,
            industry: "Tech",
            state: null,
            region: "West",
            geography_display: "region",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: "custom",
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: null,
            nda_document_path: "deals/deal-sent/nda.pdf",
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-01T00:00:00.000Z",
          },
        },
        {
          id: "eng-custom-pending",
          stage: "nda_pending",
          nda_status: "pending",
          nda_signed_at: null,
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {
            id: "deal-pending",
            headline: "Pending NDA Deal",
            description: null,
            industry: "Tech",
            state: null,
            region: "West",
            geography_display: "region",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: "custom",
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: "deals/deal-pending/teaser.pdf",
            cim_document_path: "deals/deal-pending/cim.pdf",
            nda_document_path: "deals/deal-pending/nda.pdf",
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-01T00:00:00.000Z",
          },
        },
        {
          id: "eng-custom-signed",
          stage: "pursued",
          nda_status: "signed",
          nda_signed_at: "2026-01-02T00:00:00.000Z",
          cim_released: true,
          cim_released_at: "2026-01-03T00:00:00.000Z",
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {
            id: "deal-signed",
            headline: "Signed NDA Deal",
            description: null,
            industry: "Tech",
            state: null,
            region: "West",
            geography_display: "region",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: "custom",
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: "deals/deal-signed/cim.pdf",
            nda_document_path: "deals/deal-signed/nda.pdf",
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-02T00:00:00.000Z",
          },
        },
        {
          id: "eng-platform-sent",
          stage: "nda_pending",
          nda_status: "sent",
          nda_signed_at: null,
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          created_at: "2026-01-03T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {
            id: "deal-platform-sent",
            headline: "Platform NDA Deal",
            description: null,
            industry: "Tech",
            state: null,
            region: "South",
            geography_display: "region",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: "platform",
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: null,
            nda_document_path: "deals/deal-platform-sent/nda.pdf",
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-03T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.viewer).toEqual({ isApprovedBuyer: true });
    const byId = new Map<
      string,
      { deal: { has_teaser_document: boolean; has_cim_document: boolean; has_nda_document: boolean } }
    >(
      payload.engagements.map(
        (entry: {
          id: string;
          deal: { has_teaser_document: boolean; has_cim_document: boolean; has_nda_document: boolean };
        }) => [entry.id, entry]
      )
    );

    expect(byId.get("eng-custom-sent")?.deal).toMatchObject({
      has_teaser_document: false,
      has_cim_document: false,
      has_nda_document: true,
    });

    expect(byId.get("eng-custom-pending")?.deal).toMatchObject({
      has_teaser_document: true,
      has_cim_document: false,
      has_nda_document: false,
    });

    expect(byId.get("eng-custom-signed")?.deal).toMatchObject({
      has_teaser_document: false,
      has_cim_document: true,
      has_nda_document: true,
    });

    expect(byId.get("eng-platform-sent")?.deal).toMatchObject({
      has_teaser_document: false,
      has_cim_document: false,
      has_nda_document: false,
    });
  });

  it("accepts nested deals when Supabase returns a single-item array", async () => {
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-array",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
          project_id: null,
          deals: [
            {
              id: "deal-first",
              headline: "First Deal",
              description: null,
              industry: "Tech",
              state: "CA",
              region: null,
              geography_display: "state",
              status: "accepting_iois",
              revenue_year_1: null,
              ebitda_year_1: null,
              revenue_year_2: null,
              ebitda_year_2: null,
              revenue_year_3: null,
              ebitda_year_3: null,
              revenue_projection: null,
              ebitda_projection: null,
              fiscal_year_labels: null,
              nda_type: "custom",
              cim_sharing_preference: null,
              nda_vetting_preference: null,
              teaser_document_path: null,
              cim_document_path: null,
              nda_document_path: "deals/deal-first/nda.pdf",
              ioi_due_date: null,
              loi_due_date: null,
              published_at: null,
              closed_at: null,
              created_at: "2025-12-01T00:00:00.000Z",
            },
          ],
        },
      ],
      buyerProjects: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.engagements).toHaveLength(1);
    expect(payload.engagements[0]).toMatchObject({
      id: "eng-array",
      deal: {
        id: "deal-first",
        headline: "First Deal",
        geography: "CA",
        date_received: "2025-12-01T00:00:00.000Z",
      },
      engagement: {
        date_received: "2025-12-01T00:00:00.000Z",
      },
    });
  });

  it("drops engagements when nested deals are null, malformed, empty arrays, or multi-item arrays", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-null-deal",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: null,
        },
        {
          id: "eng-string-deal",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-01T01:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: "deal-id",
        },
        {
          id: "eng-number-deal",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-01T02:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: 42,
        },
        {
          id: "eng-empty-object",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-01T03:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {},
        },
        {
          id: "eng-empty-array",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: [],
        },
        {
          id: "eng-multi-array",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-02T12:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: [
            {
              id: "deal-multi-1",
              headline: "Multi One",
              description: null,
              industry: "Tech",
              state: null,
              region: "West",
              geography_display: "region",
              status: "accepting_iois",
              revenue_year_1: null,
              ebitda_year_1: null,
              revenue_year_2: null,
              ebitda_year_2: null,
              revenue_year_3: null,
              ebitda_year_3: null,
              revenue_projection: null,
              ebitda_projection: null,
              fiscal_year_labels: null,
              nda_type: "custom",
              cim_sharing_preference: null,
              nda_vetting_preference: null,
              teaser_document_path: null,
              cim_document_path: null,
              nda_document_path: "deals/deal-multi-1/nda.pdf",
              ioi_due_date: null,
              loi_due_date: null,
              published_at: null,
              closed_at: null,
              created_at: "2025-12-02T00:00:00.000Z",
            },
            {
              id: "deal-multi-2",
              headline: "Multi Two",
              description: null,
              industry: "Tech",
              state: null,
              region: "West",
              geography_display: "region",
              status: "accepting_iois",
              revenue_year_1: null,
              ebitda_year_1: null,
              revenue_year_2: null,
              ebitda_year_2: null,
              revenue_year_3: null,
              ebitda_year_3: null,
              revenue_projection: null,
              ebitda_projection: null,
              fiscal_year_labels: null,
              nda_type: "custom",
              cim_sharing_preference: null,
              nda_vetting_preference: null,
              teaser_document_path: null,
              cim_document_path: null,
              nda_document_path: "deals/deal-multi-2/nda.pdf",
              ioi_due_date: null,
              loi_due_date: null,
              published_at: null,
              closed_at: null,
              created_at: "2025-12-02T00:00:00.000Z",
            },
          ],
        },
        {
          id: "eng-valid",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-03T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {
            id: "deal-valid",
            headline: "Valid Deal",
            description: null,
            industry: "Tech",
            state: null,
            region: "West",
            geography_display: "region",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: "custom",
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: null,
            nda_document_path: "deals/deal-valid/nda.pdf",
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-03T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.engagements).toHaveLength(1);
    expect(payload.meta).toEqual({
      partial_results: true,
      skipped_malformed_engagements: 6,
    });
    expect(payload.engagements[0]).toMatchObject({
      id: "eng-valid",
      deal: { id: "deal-valid" },
    });
    expect(payload.engagements.map((engagement: { id: string }) => engagement.id)).toEqual(["eng-valid"]);

    expect(warnSpy).toHaveBeenCalledWith(
      "Skipped malformed buyer engagement rows during normalization",
      {
        userId: "b***1",
        totalRows: 7,
        returnedRows: 1,
        skippedMalformedEngagements: 6,
        skippedByReason: {
          missing_related_deal: 3,
          invalid_related_deal_shape: 3,
        },
      }
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [, warningContext] = warnSpy.mock.calls[0] ?? [];
    expect(JSON.stringify(warningContext)).not.toContain("eng-null-deal");
    expect(JSON.stringify(warningContext)).not.toContain("deal-multi-1");
    expect(JSON.stringify(warningContext)).not.toContain("buyer-1");
  });

  it("logs info instead of warn when malformed row count is below warning threshold", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-malformed",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: null,
        },
        {
          id: "eng-valid",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-03T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {
            id: "deal-valid",
            headline: "Valid Deal",
            description: null,
            industry: "Tech",
            state: null,
            region: "West",
            geography_display: "region",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: "custom",
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: null,
            nda_document_path: "deals/deal-valid/nda.pdf",
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-03T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      meta: {
        partial_results: true,
        skipped_malformed_engagements: 1,
      },
    });

    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      "Detected malformed buyer engagement rows during normalization (below warn threshold)",
      {
        userId: "b***1",
        totalRows: 2,
        returnedRows: 1,
        skippedMalformedEngagements: 1,
        skippedByReason: {
          missing_related_deal: 1,
          invalid_related_deal_shape: 0,
        },
        warningThreshold: 3,
      }
    );
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it("sorts by updated_at desc and falls back to created_at when updated_at is null", async () => {
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-old",
          stage: "pursued",
          nda_status: "pending_review",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T01:00:00.000Z",
          project_id: null,
          deals: {
            id: "deal-old",
            headline: "Old Deal",
            description: null,
            industry: "Tech",
            state: null,
            region: "Midwest",
            geography_display: "region",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: null,
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: null,
            nda_document_path: null,
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-01T00:00:00.000Z",
          },
        },
        {
          id: "eng-new-by-created",
          stage: "nda_signed",
          nda_status: "signed",
          created_at: "2026-01-05T00:00:00.000Z",
          updated_at: null,
          project_id: null,
          deals: {
            id: "deal-new",
            headline: "New Deal",
            description: null,
            industry: "Healthcare",
            state: null,
            region: "Northeast",
            geography_display: "region",
            status: "accepting_lois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: null,
            ebitda_year_3: null,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: null,
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: null,
            nda_document_path: null,
            ioi_due_date: null,
            loi_due_date: null,
            published_at: null,
            closed_at: null,
            created_at: "2025-12-05T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json();
    expect(payload.viewer).toEqual({ isApprovedBuyer: true });
    expect(payload.engagements.map((engagement: { id: string }) => engagement.id)).toEqual([
      "eng-new-by-created",
      "eng-old",
    ]);
  });

  it("nulls project_id and project_name when project is not buyer-owned", async () => {
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-1",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
          project_id: "foreign-project",
          deals: {
            id: "deal-1",
            headline: "Alpha Tools",
            description: null,
            industry: "Industrial",
            state: "TX",
            region: null,
            geography_display: "state",
            status: "accepting_iois",
            revenue_year_1: null,
            ebitda_year_1: null,
            revenue_year_2: null,
            ebitda_year_2: null,
            revenue_year_3: 120,
            ebitda_year_3: 20,
            revenue_projection: null,
            ebitda_projection: null,
            fiscal_year_labels: null,
            nda_type: null,
            cim_sharing_preference: null,
            nda_vetting_preference: null,
            teaser_document_path: null,
            cim_document_path: null,
            nda_document_path: null,
            ioi_due_date: null,
            loi_due_date: null,
            published_at: "2025-12-01T00:00:00.000Z",
            closed_at: null,
            created_at: "2025-11-15T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [{ id: "project-1", name: "Platform Build" }],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      meta: {
        partial_results: false,
        skipped_malformed_engagements: 0,
      },
      viewer: {
        isApprovedBuyer: true,
      },
      engagements: [
        expect.objectContaining({
          id: "eng-1",
          project_id: null,
          project_name: null,
        }),
      ],
    });
  });

  it("returns 500 with generic message when engagement query fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const engagementsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "db unavailable" },
      }),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "deal_engagements") return engagementsQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Failed to fetch engagements" });
    expect(errorSpy).toHaveBeenCalledWith("Failed to fetch buyer engagements", {
      userId: "b***1",
      error: { message: "db unavailable" },
    });
  });

  it("returns 500 with generic message when buyer project lookup fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const engagementsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: "eng-1",
            stage: "pursued",
            nda_status: "pending_review",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-02T00:00:00.000Z",
            project_id: "project-1",
            deals: {
              id: "deal-1",
              headline: "Alpha",
              description: null,
              industry: "Tech",
              state: null,
              region: "West",
              geography_display: "region",
              status: "accepting_iois",
              revenue_year_1: null,
              ebitda_year_1: null,
              revenue_year_2: null,
              ebitda_year_2: null,
              revenue_year_3: null,
              ebitda_year_3: null,
              revenue_projection: null,
              ebitda_projection: null,
              fiscal_year_labels: null,
              nda_type: null,
              cim_sharing_preference: null,
              nda_vetting_preference: null,
              teaser_document_path: null,
              cim_document_path: null,
              nda_document_path: null,
              ioi_due_date: null,
              loi_due_date: null,
              published_at: null,
              closed_at: null,
              created_at: "2025-12-01T00:00:00.000Z",
            },
          },
        ],
        error: null,
      }),
    };

    const buyerProjectsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: "lookup failed" } }),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "deal_engagements") return engagementsQuery;
        if (table === "buyer_projects") return buyerProjectsQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Failed to fetch engagements" });
    expect(errorSpy).toHaveBeenCalledWith("Failed to fetch buyer projects for engagements", {
      userId: "b***1",
      error: { message: "lookup failed" },
    });
  });

  it("sets viewer approval to false when profile status is missing (fail-closed)", async () => {
    const supabase = createSupabaseForEngagements({
      engagements: [],
      buyerProjects: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      meta: {
        partial_results: false,
        skipped_malformed_engagements: 0,
      },
      viewer: {
        isApprovedBuyer: false,
      },
      engagements: [],
    });
  });
});
