import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { GET } from "@/app/api/buyer/analytics/route";

function createAnalyticsSupabase({
  engagements,
  ioisCount,
  loisCount,
  engagementsError = null,
  ioisError = null,
  loisError = null,
}: {
  engagements: Array<Record<string, unknown>>;
  ioisCount: number;
  loisCount: number;
  engagementsError?: { message: string } | null;
  ioisError?: { message: string } | null;
  loisError?: { message: string } | null;
}) {
  const engagementsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: engagements, error: engagementsError }),
  };

  const ioisQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: ioisCount, error: ioisError }),
  };

  const loisQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: loisCount, error: loisError }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "deal_engagements") return engagementsQuery;
      if (table === "iois") return ioisQuery;
      if (table === "lois") return loisQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    engagementsQuery,
    ioisQuery,
    loisQuery,
  };
}

describe("GET /api/buyer/analytics", () => {
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

  it("derives activity deal labels from headline, then project_name, then confidential fallback", async () => {
    const supabase = createAnalyticsSupabase({
      engagements: [
        {
          id: "eng-3",
          stage: "pursued",
          nda_status: "pending_review",
          created_at: "2026-01-03T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
          deal_id: "12345678-aaaa-bbbb",
          deals: {
            headline: "  Headline Deal  ",
            project_name: "Project Name Should Not Win",
            industry: "Industrial",
            revenue_year_3: 120,
            ebitda_year_3: 18,
          },
        },
        {
          id: "eng-2",
          stage: "nda_signed",
          nda_status: "signed",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          deal_id: "87654321-cccc-dddd",
          deals: {
            headline: "   ",
            project_name: "  Project Label  ",
            industry: "Healthcare",
            revenue_year_3: 100,
            ebitda_year_3: 12,
          },
        },
        {
          id: "eng-1",
          stage: "reviewing",
          nda_status: "pending_review",
          created_at: "2026-01-01T12:00:00.000Z",
          updated_at: "2026-01-01T12:00:00.000Z",
          deal_id: null,
          deals: null,
        },
        {
          id: "eng-0",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          deal_id: "99990000-eeee-ffff",
          deals: {
            headline: null,
            project_name: null,
            industry: "   ",
            revenue_year_3: null,
            ebitda_year_3: null,
          },
        },
      ],
      ioisCount: 3,
      loisCount: 1,
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.activity).toEqual([
      expect.objectContaining({ id: "eng-3", deal_label: "Headline Deal" }),
      expect.objectContaining({ id: "eng-2", deal_label: "Project Label" }),
      expect.objectContaining({ id: "eng-1", deal_label: "Confidential Deal" }),
      expect.objectContaining({ id: "eng-0", deal_label: "Confidential Deal" }),
    ]);

    const labels = payload.activity.map((item: { deal_label: string }) => item.deal_label);
    for (const label of labels) {
      expect(label).not.toContain("99990000");
      expect(label).not.toContain("87654321");
    }

    expect(supabase.engagementsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(supabase.ioisQuery.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(supabase.loisQuery.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("returns 500 when engagements query fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createAnalyticsSupabase({
      engagements: [],
      ioisCount: 0,
      loisCount: 0,
      engagementsError: { message: "engagements query failed" },
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to load buyer analytics" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch buyer engagements analytics", {
      userId: "buyer-1",
      error: "engagements query failed",
    });
    consoleErrorSpy.mockRestore();
  });

  it("returns 500 when IOI query fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createAnalyticsSupabase({
      engagements: [],
      ioisCount: 0,
      loisCount: 0,
      ioisError: { message: "iois query failed" },
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to load buyer analytics" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch buyer IOI analytics", {
      userId: "buyer-1",
      error: "iois query failed",
    });
    consoleErrorSpy.mockRestore();
  });

  it("returns 500 when LOI query fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = createAnalyticsSupabase({
      engagements: [],
      ioisCount: 0,
      loisCount: 0,
      loisError: { message: "lois query failed" },
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to load buyer analytics" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch buyer LOI analytics", {
      userId: "buyer-1",
      error: "lois query failed",
    });
    consoleErrorSpy.mockRestore();
  });

  it("normalizes numeric-like values and trims industry bucket keys", async () => {
    const supabase = createAnalyticsSupabase({
      engagements: [
        {
          id: "eng-1",
          stage: "pursued",
          nda_status: "pending_review",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          deal_id: "deal-1",
          deals: {
            headline: "Deal One",
            industry: " Healthcare ",
            revenue_year_3: "100.5",
            ebitda_year_3: "20",
          },
        },
        {
          id: "eng-2",
          stage: "reviewing",
          nda_status: "pending_review",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          deal_id: "deal-2",
          deals: {
            headline: "Deal Two",
            industry: "Healthcare",
            revenue_year_3: 199.5,
            ebitda_year_3: "not-a-number",
          },
        },
        {
          id: "eng-3",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-01-03T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
          deal_id: "deal-3",
          deals: {
            headline: "Deal Three",
            industry: "Healthcare  ",
            revenue_year_3: "300",
            ebitda_year_3: "50.5",
          },
        },
        {
          id: "eng-4",
          stage: "nda_signed",
          nda_status: "signed",
          created_at: "2026-01-04T00:00:00.000Z",
          updated_at: "2026-01-04T00:00:00.000Z",
          deal_id: "deal-4",
          deals: {
            headline: "Deal Four",
            industry: "   ",
            revenue_year_3: "Infinity",
            ebitda_year_3: "-Infinity",
          },
        },
        {
          id: "eng-5",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-01-05T00:00:00.000Z",
          updated_at: "2026-01-05T00:00:00.000Z",
          deal_id: null,
          deals: null,
        },
      ],
      ioisCount: 2,
      loisCount: 1,
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.analytics.avgRevenue).toBe(150);
    expect(payload.analytics.avgEbitda).toBe(20);
    expect(payload.analytics.avgMatchedRevenue).toBe(200);
    expect(payload.analytics.avgMatchedEbitda).toBe(35.25);

    expect(payload.analytics.dealsByIndustry).toEqual({
      Healthcare: 3,
      Unknown: 2,
    });
    expect(payload.analytics.dealsByIndustry[" Healthcare "]).toBeUndefined();
    expect(payload.analytics.dealsByIndustry["Healthcare  "]).toBeUndefined();
  });

  it("normalizes serialized and legacy quoted pseudo-array industry strings while bucketing malformed wrappers as Unknown", async () => {
    const supabase = createAnalyticsSupabase({
      engagements: [
        {
          id: "eng-1",
          stage: "pursued",
          nda_status: "pending_review",
          created_at: "2026-02-01T00:00:00.000Z",
          updated_at: "2026-02-01T00:00:00.000Z",
          deal_id: "deal-1",
          deals: {
            headline: "Deal One",
            industry: '["Healthcare"]',
            revenue_year_3: 100,
            ebitda_year_3: 20,
          },
        },
        {
          id: "eng-2",
          stage: "reviewing",
          nda_status: "pending_review",
          created_at: "2026-02-02T00:00:00.000Z",
          updated_at: "2026-02-02T00:00:00.000Z",
          deal_id: "deal-2",
          deals: {
            headline: "Deal Two",
            industry: "[foo]",
            revenue_year_3: 120,
            ebitda_year_3: 24,
          },
        },
        {
          id: "eng-2b",
          stage: "reviewing",
          nda_status: "pending_review",
          created_at: "2026-02-02T12:00:00.000Z",
          updated_at: "2026-02-02T12:00:00.000Z",
          deal_id: "deal-2b",
          deals: {
            headline: "Deal Two B",
            industry: "['Industrial']",
            revenue_year_3: 125,
            ebitda_year_3: 25,
          },
        },
        {
          id: "eng-3",
          stage: "nda_signed",
          nda_status: "signed",
          created_at: "2026-02-03T00:00:00.000Z",
          updated_at: "2026-02-03T00:00:00.000Z",
          deal_id: "deal-3",
          deals: {
            headline: "Deal Three",
            industry: "{Business Services}",
            revenue_year_3: 150,
            ebitda_year_3: 30,
          },
        },
        {
          id: "eng-4",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-02-04T00:00:00.000Z",
          updated_at: "2026-02-04T00:00:00.000Z",
          deal_id: "deal-4",
          deals: {
            headline: "Deal Four",
            industry: "   ",
            revenue_year_3: 90,
            ebitda_year_3: 10,
          },
        },
        {
          id: "eng-5",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-02-05T00:00:00.000Z",
          updated_at: "2026-02-05T00:00:00.000Z",
          deal_id: "deal-5",
          deals: {
            headline: "Deal Five",
            industry: null,
            revenue_year_3: 80,
            ebitda_year_3: 8,
          },
        },
        {
          id: "eng-6",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-02-06T00:00:00.000Z",
          updated_at: "2026-02-06T00:00:00.000Z",
          deal_id: "deal-6",
          deals: {
            headline: "Deal Six",
            industry: 42,
            revenue_year_3: 75,
            ebitda_year_3: 7,
          },
        },
        {
          id: "eng-7",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-02-07T00:00:00.000Z",
          updated_at: "2026-02-07T00:00:00.000Z",
          deal_id: "deal-7",
          deals: {
            headline: "Deal Seven",
            industry: "[]",
            revenue_year_3: 70,
            ebitda_year_3: 6,
          },
        },
        {
          id: "eng-8",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-02-08T00:00:00.000Z",
          updated_at: "2026-02-08T00:00:00.000Z",
          deal_id: "deal-8",
          deals: {
            headline: "Deal Eight",
            industry: "[42]",
            revenue_year_3: 65,
            ebitda_year_3: 5,
          },
        },
        {
          id: "eng-9",
          stage: "passed",
          nda_status: "not_sent",
          created_at: "2026-02-09T00:00:00.000Z",
          updated_at: "2026-02-09T00:00:00.000Z",
          deal_id: "deal-9",
          deals: {
            headline: "Deal Nine",
            industry: "{}",
            revenue_year_3: 60,
            ebitda_year_3: 4,
          },
        },
      ],
      ioisCount: 0,
      loisCount: 0,
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.analytics.dealsByIndustry).toEqual({
      Healthcare: 1,
      Industrial: 1,
      "Business Services": 1,
      Unknown: 7,
    });
  });

  it("safely buckets dangerous stage and industry keys without crashing", async () => {
    const supabase = createAnalyticsSupabase({
      engagements: [
        {
          id: "eng-1",
          stage: "__proto__",
          nda_status: "pending_review",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
          deal_id: "deal-1",
          deals: {
            headline: "Deal One",
            industry: "__proto__",
            revenue_year_3: 100,
            ebitda_year_3: 20,
          },
        },
        {
          id: "eng-2",
          stage: "constructor",
          nda_status: "pending_review",
          created_at: "2026-03-02T00:00:00.000Z",
          updated_at: "2026-03-02T00:00:00.000Z",
          deal_id: "deal-2",
          deals: {
            headline: "Deal Two",
            industry: "['constructor']",
            revenue_year_3: 120,
            ebitda_year_3: 24,
          },
        },
        {
          id: "eng-3",
          stage: "prototype",
          nda_status: "not_sent",
          created_at: "2026-03-03T00:00:00.000Z",
          updated_at: "2026-03-03T00:00:00.000Z",
          deal_id: "deal-3",
          deals: {
            headline: "Deal Three",
            industry: "[\"prototype\"]",
            revenue_year_3: 150,
            ebitda_year_3: 30,
          },
        },
        {
          id: "eng-4",
          stage: "reviewing",
          nda_status: "signed",
          created_at: "2026-03-04T00:00:00.000Z",
          updated_at: "2026-03-04T00:00:00.000Z",
          deal_id: "deal-4",
          deals: {
            headline: "Deal Four",
            industry: "Healthcare",
            revenue_year_3: 180,
            ebitda_year_3: 36,
          },
        },
      ],
      ioisCount: 1,
      loisCount: 0,
    });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.analytics.dealsByStage).toEqual({
      unknown: 3,
      reviewing: 1,
    });
    expect(Object.prototype.hasOwnProperty.call(payload.analytics.dealsByStage, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload.analytics.dealsByStage, "constructor")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload.analytics.dealsByStage, "prototype")).toBe(false);

    expect(payload.analytics.dealsByIndustry).toEqual({
      Unknown: 3,
      Healthcare: 1,
    });
    expect(Object.prototype.hasOwnProperty.call(payload.analytics.dealsByIndustry, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload.analytics.dealsByIndustry, "constructor")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload.analytics.dealsByIndustry, "prototype")).toBe(false);
  });
});
