import { describe, it, expect, beforeEach, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: supabaseMocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { GET as getNda, POST as postNda } from "@/app/api/deals/[id]/nda/route";

function createNdaSupabase({
  profile,
  deal,
  engagement,
}: {
  profile?: { role: string; status: string } | null;
  deal?: { nda_type?: "platform" | "custom"; nda_document_path?: string | null };
  engagement: { id: string; stage: string; nda_status: string } | null;
}) {
  const userQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: profile ?? { role: "buyer", status: "approved" },
      error: null,
    }),
  };

  const dealQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: "deal-1",
        headline: "Acme Industrial",
        nda_type: deal?.nda_type ?? "platform",
        nda_document_path: deal?.nda_document_path ?? null,
      },
      error: null,
    }),
  };

  const engagementQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: engagement,
      error: null,
    }),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "buyer-1" } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "users") return userQuery;
      if (table === "deals") return dealQuery;
      if (table === "deal_engagements") return engagementQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    userQuery,
    dealQuery,
    engagementQuery,
  };
}

describe("NDA route signed-view runtime behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows GET for buyers with signed NDA engagement", async () => {
    const supabase = createNdaSupabase({
      engagement: { id: "eng-1", stage: "nda_signed", nda_status: "signed" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNda(new Request("http://localhost/api/deals/deal-1/nda"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        deal: expect.objectContaining({ id: "deal-1" }),
        engagement: expect.objectContaining({ id: "eng-1", nda_status: "signed" }),
        serverDate: expect.any(String),
      })
    );
  });

  it("returns controlled 403 when engagement does not exist", async () => {
    const supabase = createNdaSupabase({
      engagement: null,
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNda(new Request("http://localhost/api/deals/deal-1/nda"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "NDA not available" });
  });

  it("returns controlled 403 for custom NDA without document path", async () => {
    const supabase = createNdaSupabase({
      deal: { nda_type: "custom", nda_document_path: null },
      engagement: { id: "eng-1", stage: "nda_pending", nda_status: "sent" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNda(new Request("http://localhost/api/deals/deal-1/nda"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "NDA not available" });
  });

  it("rejects POST actions when NDA is already signed", async () => {
    const supabase = createNdaSupabase({
      engagement: { id: "eng-1", stage: "nda_signed", nda_status: "signed" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await postNda(
      new Request("http://localhost/api/deals/deal-1/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      }),
      { params: { id: "deal-1" } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "NDA not available" });
  });

  it("returns controlled 403 for POST when custom NDA is missing document path", async () => {
    const supabase = createNdaSupabase({
      deal: { nda_type: "custom", nda_document_path: null },
      engagement: { id: "eng-1", stage: "nda_pending", nda_status: "sent" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await postNda(
      new Request("http://localhost/api/deals/deal-1/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      }),
      { params: { id: "deal-1" } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "NDA not available" });
  });

  it("returns controlled 403 for POST when engagement does not exist", async () => {
    const supabase = createNdaSupabase({
      engagement: null,
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await postNda(
      new Request("http://localhost/api/deals/deal-1/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      }),
      { params: { id: "deal-1" } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "NDA not available" });
  });
});
