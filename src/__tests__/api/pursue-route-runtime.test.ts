import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: supabaseMocks.createClient,
}));

import { POST as pursueDeal } from "@/app/api/deals/[id]/pursue/route";

type PursueSupabaseOptions = {
  user?: { id: string } | null;
  profile?: { role: string; status: string; firm_id: string | null } | null;
  deal?: { id: string; status: string; nda_vetting_preference: "auto" | "manual"; firm_id: string } | null;
  existingEngagement?: { id: string; stage: string } | null;
  createdEngagement?: Record<string, unknown> | null;
  updatedEngagement?: Record<string, unknown> | null;
};

function createPursueSupabase(options: PursueSupabaseOptions = {}) {
  const user = options.user ?? { id: "buyer-1" };
  const profile = options.profile ?? { role: "buyer", status: "approved", firm_id: "buyer-firm-1" };
  const deal =
    options.deal ??
    ({
      id: "deal-1",
      status: "accepting_iois",
      nda_vetting_preference: "auto",
      firm_id: "broker-firm-1",
    } as const);
  const existingEngagement = options.existingEngagement ?? null;

  const usersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profile, error: null }),
  };

  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: deal, error: null }),
  };

  const insertSingle = vi.fn().mockResolvedValue({
    data: options.createdEngagement ?? { id: "engagement-1" },
    error: null,
  });
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });

  const updateSingle = vi.fn().mockResolvedValue({
    data: options.updatedEngagement ?? { id: "engagement-updated" },
    error: null,
  });
  const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
  const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const dealEngagementsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: existingEngagement, error: null }),
    insert,
    update,
  };

  const activityInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const activityTable = {
    insert: activityInsert,
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "users") return usersQuery;
      if (table === "deals") return dealsQuery;
      if (table === "deal_engagements") return dealEngagementsTable;
      if (table === "deal_activity_log") return activityTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
    usersQuery,
    dealsQuery,
    dealEngagementsTable,
    insert,
    activityInsert,
  };
}

describe("POST /api/deals/[id]/pursue runtime vetting behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto vetting creates nda_pending + sent engagement and logs nda_sent activity", async () => {
    const supabase = createPursueSupabase({
      deal: {
        id: "deal-1",
        status: "accepting_iois",
        nda_vetting_preference: "auto",
        firm_id: "broker-firm-1",
      },
      createdEngagement: { id: "eng-auto", stage: "nda_pending", nda_status: "sent" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await pursueDeal(
      new Request("http://localhost/api/deals/deal-1/pursue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "project-1" }),
      }),
      { params: { id: "deal-1" } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      engagement: { id: "eng-auto", stage: "nda_pending", nda_status: "sent" },
    });

    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        deal_id: "deal-1",
        buyer_user_id: "buyer-1",
        buyer_firm_id: "buyer-firm-1",
        project_id: "project-1",
        stage: "nda_pending",
        nda_status: "sent",
        vetting_status: null,
      })
    );

    expect(supabase.activityInsert).toHaveBeenCalledTimes(2);
    expect(supabase.activityInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        deal_id: "deal-1",
        actor_id: "buyer-1",
        action: "buyer_pursued",
        metadata: { buyer_firm_id: "buyer-firm-1" },
      })
    );
    expect(supabase.activityInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        deal_id: "deal-1",
        actor_id: "buyer-1",
        action: "nda_sent",
        metadata: { buyer_user_id: "buyer-1" },
      })
    );
  });

  it("manual vetting creates pursued + pending_review engagement with pending vetting", async () => {
    const supabase = createPursueSupabase({
      deal: {
        id: "deal-1",
        status: "accepting_iois",
        nda_vetting_preference: "manual",
        firm_id: "broker-firm-1",
      },
      createdEngagement: {
        id: "eng-manual",
        stage: "pursued",
        nda_status: "pending_review",
        vetting_status: "pending",
      },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await pursueDeal(
      new Request("http://localhost/api/deals/deal-1/pursue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "project-2" }),
      }),
      { params: { id: "deal-1" } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      engagement: {
        id: "eng-manual",
        stage: "pursued",
        nda_status: "pending_review",
        vetting_status: "pending",
      },
    });

    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        deal_id: "deal-1",
        buyer_user_id: "buyer-1",
        buyer_firm_id: "buyer-firm-1",
        project_id: "project-2",
        stage: "pursued",
        nda_status: "pending_review",
        vetting_status: "pending",
      })
    );

    expect(supabase.activityInsert).toHaveBeenCalledTimes(1);
    expect(supabase.activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "buyer_pursued",
        metadata: { buyer_firm_id: "buyer-firm-1" },
      })
    );
  });

  it("returns 400 for already-engaged non-declined and does not create engagement", async () => {
    const supabase = createPursueSupabase({
      existingEngagement: { id: "eng-existing", stage: "pursued" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await pursueDeal(new Request("http://localhost/api/deals/deal-1/pursue", { method: "POST" }), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Already engaged with this deal" });
    expect(supabase.insert).not.toHaveBeenCalled();
    expect(supabase.activityInsert).not.toHaveBeenCalled();
  });

  it("auto vetting re-engagement updates declined engagement and logs re_engagement activity", async () => {
    const supabase = createPursueSupabase({
      deal: {
        id: "deal-1",
        status: "accepting_iois",
        nda_vetting_preference: "auto",
        firm_id: "broker-firm-1",
      },
      existingEngagement: { id: "eng-declined-auto", stage: "declined" },
      updatedEngagement: {
        id: "eng-declined-auto",
        stage: "nda_pending",
        nda_status: "sent",
        vetting_status: null,
        project_id: "project-re-eng-auto",
      },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await pursueDeal(
      new Request("http://localhost/api/deals/deal-1/pursue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "project-re-eng-auto" }),
      }),
      { params: { id: "deal-1" } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      engagement: {
        id: "eng-declined-auto",
        stage: "nda_pending",
        nda_status: "sent",
        vetting_status: null,
        project_id: "project-re-eng-auto",
      },
    });

    expect(supabase.insert).not.toHaveBeenCalled();
    expect(supabase.dealEngagementsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "nda_pending",
        nda_status: "sent",
        vetting_status: null,
        project_id: "project-re-eng-auto",
      })
    );

    expect(supabase.activityInsert).toHaveBeenCalledTimes(1);
    expect(supabase.activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deal_id: "deal-1",
        actor_id: "buyer-1",
        action: "buyer_pursued",
        metadata: { buyer_firm_id: "buyer-firm-1", re_engagement: true },
      })
    );
  });

  it("manual vetting re-engagement updates declined engagement and logs re_engagement activity", async () => {
    const supabase = createPursueSupabase({
      deal: {
        id: "deal-1",
        status: "accepting_iois",
        nda_vetting_preference: "manual",
        firm_id: "broker-firm-1",
      },
      existingEngagement: { id: "eng-declined-manual", stage: "declined" },
      updatedEngagement: {
        id: "eng-declined-manual",
        stage: "pursued",
        nda_status: "pending_review",
        vetting_status: "pending",
        project_id: "project-re-eng-manual",
      },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await pursueDeal(
      new Request("http://localhost/api/deals/deal-1/pursue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "project-re-eng-manual" }),
      }),
      { params: { id: "deal-1" } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      engagement: {
        id: "eng-declined-manual",
        stage: "pursued",
        nda_status: "pending_review",
        vetting_status: "pending",
        project_id: "project-re-eng-manual",
      },
    });

    expect(supabase.insert).not.toHaveBeenCalled();
    expect(supabase.dealEngagementsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "pursued",
        nda_status: "pending_review",
        vetting_status: "pending",
        project_id: "project-re-eng-manual",
      })
    );

    expect(supabase.activityInsert).toHaveBeenCalledTimes(1);
    expect(supabase.activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deal_id: "deal-1",
        actor_id: "buyer-1",
        action: "buyer_pursued",
        metadata: { buyer_firm_id: "buyer-firm-1", re_engagement: true },
      })
    );
  });
});
