import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVE_DEAL_STATUSES } from "@/lib/constants";

const authMocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { GET } from "@/app/api/projects/[id]/matches/route";

type ProjectRow = {
  id: string;
  buyer_user_id: string;
  industry: string | null;
  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;
  ebitda_margin: number | null;
  location: string | null;
  keywords: string[] | null;
  is_active: boolean;
};

function createThenableQuery<T extends Record<string, unknown>>(result: T) {
  const query: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    gt: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    then: Promise<T>["then"];
  } = {
    select: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    gt: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  query.select.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.or.mockReturnValue(query);

  return query;
}

function createMatchesSupabase({
  project,
  deals,
  engagements,
}: {
  project: ProjectRow;
  deals: Array<Record<string, unknown>>;
  engagements: Array<Record<string, unknown>>;
}) {
  const projectSingle = vi.fn().mockResolvedValue({ data: project, error: null });
  const projectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: projectSingle,
  };

  const dealsQuery = createThenableQuery({ data: deals, error: null });
  const engagementsQuery = createThenableQuery({ data: engagements, error: null });

  const from = vi.fn((table: string) => {
    if (table === "buyer_projects") return projectQuery;
    if (table === "deals") return dealsQuery;
    if (table === "deal_engagements") return engagementsQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    projectQuery,
    dealsQuery,
    engagementsQuery,
  };
}

describe("GET /api/projects/[id]/matches runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing engagement deals for inactive projects without running criteria scan", async () => {
    const supabase = createMatchesSupabase({
      project: {
        id: "project-1",
        buyer_user_id: "buyer-1",
        industry: null,
        revenue_min: null,
        revenue_max: null,
        ebitda_min: null,
        ebitda_max: null,
        ebitda_margin: null,
        location: null,
        keywords: null,
        is_active: false,
      },
      deals: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          headline: "Existing Engagement Deal",
          description: "Already engaged while project was active",
          industry: "Industrial",
          state: "TX",
          region: null,
          geography_display: "state",
          status: "accepting_iois",
          revenue_year_1: null,
          ebitda_year_1: null,
          revenue_year_2: null,
          ebitda_year_2: null,
          revenue_year_3: 110,
          ebitda_year_3: 16,
          revenue_projection: null,
          ebitda_projection: null,
          fiscal_year_labels: null,
          nda_type: "platform",
          cim_sharing_preference: null,
          nda_vetting_preference: null,
          teaser_document_path: null,
          cim_document_path: "deals/00000000-0000-4000-8000-000000000001/cim.pdf",
          nda_document_path: null,
          ioi_due_date: null,
          loi_due_date: null,
          published_at: null,
          closed_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      engagements: [
        {
          id: "eng-1",
          deal_id: "00000000-0000-4000-8000-000000000001",
          stage: "nda_signed",
          nda_status: "signed",
          nda_signed_at: "2026-01-03T00:00:00.000Z",
          cim_released: true,
          cim_released_at: "2026-01-04T00:00:00.000Z",
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: "approved",
          vetting_rejection_reason: null,
        },
      ],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET(new Request("http://localhost/api/projects/project-1/matches"), {
      params: { id: "project-1" },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.viewer).toEqual({ isApprovedBuyer: true });
    expect(payload.nextCursor).toBeNull();
    expect(payload.deals).toHaveLength(1);
    expect(payload.deals[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      date_received: "2026-01-01T00:00:00.000Z",
      has_teaser_document: false,
      has_cim_document: true,
      has_nda_document: false,
      engagement: {
        id: "eng-1",
        deal_id: "00000000-0000-4000-8000-000000000001",
      },
    });

    expect(supabase.projectQuery.single).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("deal_engagements");
    expect(supabase.engagementsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(supabase.engagementsQuery.eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(supabase.engagementsQuery.order).toHaveBeenCalledWith("deal_id", { ascending: true });
    expect(supabase.engagementsQuery.limit).toHaveBeenCalledWith(21);

    expect(supabase.from).toHaveBeenCalledWith("deals");
    expect(supabase.dealsQuery.in).toHaveBeenCalledWith("id", [
      "00000000-0000-4000-8000-000000000001",
    ]);
    expect(supabase.dealsQuery.in).not.toHaveBeenCalledWith("status", ACTIVE_DEAL_STATUSES);
    expect(supabase.dealsQuery.order).not.toHaveBeenCalled();
    expect(supabase.dealsQuery.limit).not.toHaveBeenCalled();
    expect(supabase.dealsQuery.eq).not.toHaveBeenCalled();
    expect(supabase.dealsQuery.or).not.toHaveBeenCalled();
  });

  it("returns matched deals for active projects and keeps pagination contract", async () => {
    const supabase = createMatchesSupabase({
      project: {
        id: "project-1",
        buyer_user_id: "buyer-1",
        industry: null,
        revenue_min: null,
        revenue_max: null,
        ebitda_min: null,
        ebitda_max: null,
        ebitda_margin: null,
        location: null,
        keywords: null,
        is_active: true,
      },
      deals: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          headline: "Alpha Manufacturing",
          description: "Niche manufacturer",
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
          ebitda_year_3: 18,
          revenue_projection: null,
          ebitda_projection: null,
          fiscal_year_labels: null,
          nda_type: "platform",
          cim_sharing_preference: null,
          nda_vetting_preference: null,
          teaser_document_path: null,
          cim_document_path: null,
          nda_document_path: null,
          ioi_due_date: null,
          loi_due_date: null,
          published_at: null,
          closed_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      engagements: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer", status: "approved" },
    });

    const response = await GET(new Request("http://localhost/api/projects/project-1/matches"), {
      params: { id: "project-1" },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.viewer).toEqual({ isApprovedBuyer: true });
    expect(payload.nextCursor).toBeNull();
    expect(payload.deals).toHaveLength(1);
    expect(payload.deals[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      date_received: "2026-01-01T00:00:00.000Z",
      has_teaser_document: false,
      has_cim_document: false,
      has_nda_document: false,
      engagement: null,
    });
    expect(supabase.dealsQuery.in).toHaveBeenCalledWith("status", ACTIVE_DEAL_STATUSES);
  });
});
