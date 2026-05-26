import { describe, it, expect, beforeEach, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: supabaseMocks.createClient,
}));

import { GET as getNdaDocument } from "@/app/api/deals/[id]/nda/document/route";

function createNdaDocumentSupabase({
  user,
  profile,
  deal,
  engagement,
  signedUrl,
}: {
  user?: { id: string } | null;
  profile?: { role: string; status: string } | null;
  deal?: { id: string; nda_type: "platform" | "custom"; nda_document_path: string | null } | null;
  engagement?: { id: string; nda_status: string } | null;
  signedUrl?: { signedUrl: string } | null;
}) {
  const resolvedProfile = profile === undefined ? { role: "buyer", status: "approved" } : profile;
  const resolvedDeal =
    deal === undefined ? { id: "deal-1", nda_type: "custom" as const, nda_document_path: "deal-1/nda.pdf" } : deal;
  const resolvedEngagement = engagement === undefined ? { id: "eng-1", nda_status: "sent" } : engagement;
  const resolvedSignedUrl = signedUrl === undefined ? { signedUrl: "https://example.com/signed-nda" } : signedUrl;
  const resolvedUser = user === undefined ? { id: "buyer-1" } : user;

  const usersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: resolvedProfile,
      error: null,
    }),
  };

  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: resolvedDeal,
      error: null,
    }),
  };

  const engagementQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: resolvedEngagement,
      error: null,
    }),
  };

  const createSignedUrl = vi.fn().mockResolvedValue({
    data: resolvedSignedUrl,
    error: null,
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: resolvedUser } }),
    },
    from: vi.fn((table: string) => {
      if (table === "users") return usersQuery;
      if (table === "deals") return dealsQuery;
      if (table === "deal_engagements") return engagementQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: vi.fn().mockReturnValue({ createSignedUrl }),
    },
    createSignedUrl,
  };
}

describe("NDA document route runtime access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    const supabase = createNdaDocumentSupabase({ user: null });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNdaDocument(new Request("http://localhost/api/deals/deal-1/nda/document"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when engagement is missing", async () => {
    const supabase = createNdaDocumentSupabase({ engagement: null });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNdaDocument(new Request("http://localhost/api/deals/deal-1/nda/document"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "NDA not available" });
  });

  it("returns 403 when engagement NDA status is not sent or signed", async () => {
    const supabase = createNdaDocumentSupabase({
      engagement: { id: "eng-1", nda_status: "pending_review" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNdaDocument(new Request("http://localhost/api/deals/deal-1/nda/document"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "NDA not available" });
  });

  it("returns unavailable when NDA is non-custom", async () => {
    const supabase = createNdaDocumentSupabase({
      deal: { id: "deal-1", nda_type: "platform", nda_document_path: null },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNdaDocument(new Request("http://localhost/api/deals/deal-1/nda/document"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Custom NDA not available" });
  });

  it("returns unavailable when custom NDA document path is missing", async () => {
    const supabase = createNdaDocumentSupabase({
      deal: { id: "deal-1", nda_type: "custom", nda_document_path: null },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNdaDocument(new Request("http://localhost/api/deals/deal-1/nda/document"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Custom NDA not available" });
  });

  it("returns signed URL JSON for authorized buyers in JSON mode", async () => {
    const supabase = createNdaDocumentSupabase({
      engagement: { id: "eng-1", nda_status: "signed" },
      signedUrl: { signedUrl: "https://storage.example/signed" },
    });
    supabaseMocks.createClient.mockReturnValue(supabase);

    const response = await getNdaDocument(
      new Request("http://localhost/api/deals/deal-1/nda/document?format=json"),
      {
        params: { id: "deal-1" },
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ndaPath: "deal-1/nda.pdf",
      ndaUrl: "https://storage.example/signed",
    });
    expect(supabase.createSignedUrl).toHaveBeenCalledWith("deal-1/nda.pdf", 60 * 10, {
      download: false,
    });
  });
});
