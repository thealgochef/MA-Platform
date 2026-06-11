import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireRole.mockResolvedValue(authResponse);

    const response = await GET();

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
    expect(authMocks.requireRole).toHaveBeenCalledWith("buyer");
  });

  it("returns engagements with expected shape and buyer-scoped project names", async () => {
    const supabase = createSupabaseForEngagements({
      engagements: [
        {
          id: "eng-1",
          stage: "nda_pending",
          nda_status: "sent",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
          project_id: "project-1",
          deals: {
            id: "deal-1",
            headline: "Alpha Tools",
            industry: "Industrial",
            status: "accepting_iois",
            revenue_year_3: 120,
            ebitda_year_3: 20,
            state: "TX",
            region: null,
            geography_display: "state",
            published_at: "2025-12-01T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [{ id: "project-1", name: "Platform Build" }],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
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
            industry: "Industrial",
            status: "accepting_iois",
            revenue_year_3: 120,
            ebitda_year_3: 20,
            geography: "TX",
            geography_display: "state",
            published_at: "2025-12-01T00:00:00.000Z",
          },
        },
      ],
    });

    expect(supabase.engagementsQuery.select).toHaveBeenCalled();
    expect(supabase.engagementsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(supabase.buyerProjectsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(supabase.buyerProjectsQuery.in).toHaveBeenCalledWith("id", ["project-1"]);
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
            industry: "Tech",
            status: "accepting_iois",
            revenue_year_3: null,
            ebitda_year_3: null,
            state: null,
            region: "Midwest",
            geography_display: "region",
            published_at: null,
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
            industry: "Healthcare",
            status: "accepting_lois",
            revenue_year_3: null,
            ebitda_year_3: null,
            state: null,
            region: "Northeast",
            geography_display: "region",
            published_at: null,
          },
        },
      ],
      buyerProjects: [],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json();
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
            industry: "Industrial",
            status: "accepting_iois",
            revenue_year_3: 120,
            ebitda_year_3: 20,
            state: "TX",
            region: null,
            geography_display: "state",
            published_at: "2025-12-01T00:00:00.000Z",
          },
        },
      ],
      buyerProjects: [{ id: "project-1", name: "Platform Build" }],
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
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
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Failed to fetch engagements" });
  });

  it("returns 500 with generic message when buyer project lookup fails", async () => {
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
              industry: "Tech",
              status: "accepting_iois",
              revenue_year_3: null,
              ebitda_year_3: null,
              state: null,
              region: "West",
              geography_display: "region",
              published_at: null,
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
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Failed to fetch engagements" });
  });
});
