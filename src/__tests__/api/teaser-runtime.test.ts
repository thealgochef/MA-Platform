import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { GET } from "@/app/api/deals/[id]/teaser/route";

function createTeaserSupabase({
  deal,
  engagement,
  signedUrl,
  signedUrlError,
}: {
  deal?: { id: string; status: string; teaser_document_path: string | null } | null;
  engagement?: { id: string; stage: string | null } | null;
  signedUrl?: { signedUrl: string } | null;
  signedUrlError?: { message: string } | null;
}) {
  const resolvedDeal =
    deal === undefined
      ? { id: "deal-1", status: "active", teaser_document_path: "deal-1/teaser.pdf" }
      : deal;
  const resolvedEngagement = engagement === undefined ? { id: "eng-1", stage: "pursued" } : engagement;

  const dealEngagementsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedEngagement }),
  };

  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedDeal }),
  };

  const createSignedUrl = vi.fn().mockResolvedValue({
    data: signedUrl ?? { signedUrl: "https://storage.example/teaser-signed" },
    error: signedUrlError ?? null,
  });

  return {
    from: vi.fn((table: string) => {
      if (table === "deals") return dealsQuery;
      if (table === "deal_engagements") return dealEngagementsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: vi.fn().mockReturnValue({ createSignedUrl }),
    },
    dealsQuery,
    dealEngagementsQuery,
    createSignedUrl,
  };
}

describe("GET /api/deals/[id]/teaser runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when requireRole returns an auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireRole.mockResolvedValue(authResponse);

    const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser"), {
      params: { id: "deal-1" },
    });

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
    expect(authMocks.requireRole).toHaveBeenCalledWith("buyer");
  });

  it("returns 404 when teaser document path is missing", async () => {
    const supabase = createTeaserSupabase({
      deal: { id: "deal-1", status: "active", teaser_document_path: null },
    });
    authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

    const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Teaser not available" });
    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 404 when deal does not exist", async () => {
    const supabase = createTeaserSupabase({ deal: null });
    authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

    const response = await GET(new Request("http://localhost/api/deals/deal-404/teaser"), {
      params: { id: "deal-404" },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Deal not found" });
    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each(["paused", "terminated", "closed"])(
    "returns 403 when deal status is %s",
    async (status) => {
      const supabase = createTeaserSupabase({
        deal: { id: "deal-1", status, teaser_document_path: "deal-1/teaser.pdf" },
      });
      authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

      const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: `Document access revoked — deal is ${status}`,
      });
      expect(supabase.createSignedUrl).not.toHaveBeenCalled();
    }
  );

  it("returns 403 when buyer does not have an engagement for the deal", async () => {
    const supabase = createTeaserSupabase({ engagement: null });
    authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

    const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Teaser not available" });
    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each(["declined", "passed", "terminated"])(
    "returns 403 when engagement stage is %s",
    async (stage) => {
      const supabase = createTeaserSupabase({ engagement: { id: "eng-1", stage } });
      authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

      const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Teaser not available" });
      expect(supabase.createSignedUrl).not.toHaveBeenCalled();
    }
  );

  it("returns teaserUrl in JSON mode and signs with download=false", async () => {
    const supabase = createTeaserSupabase({
      deal: { id: "deal-1", status: "active", teaser_document_path: "deal-1/teaser.pdf" },
      signedUrl: { signedUrl: "https://storage.example/teaser-view" },
    });
    authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

    const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser?format=json"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    await expect(response.json()).resolves.toEqual({ teaserUrl: "https://storage.example/teaser-view" });
    expect(supabase.storage.from).toHaveBeenCalledWith("deal-documents");
    expect(supabase.createSignedUrl).toHaveBeenCalledWith("deal-1/teaser.pdf", 60 * 10, {
      download: false,
    });
  });

  it("uses download=true when action=download", async () => {
    const supabase = createTeaserSupabase({
      deal: { id: "deal-1", status: "active", teaser_document_path: "deal-1/teaser.pdf" },
      signedUrl: { signedUrl: "https://storage.example/teaser-download" },
    });
    authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

    const response = await GET(
      new Request("http://localhost/api/deals/deal-1/teaser?format=json&action=download"),
      {
        params: { id: "deal-1" },
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    await expect(response.json()).resolves.toEqual({ teaserUrl: "https://storage.example/teaser-download" });
    expect(supabase.createSignedUrl).toHaveBeenCalledWith("deal-1/teaser.pdf", 60 * 10, {
      download: true,
    });
  });

  it("redirects to signed URL when request does not ask for JSON", async () => {
    const supabase = createTeaserSupabase({
      deal: { id: "deal-1", status: "active", teaser_document_path: "deal-1/teaser.pdf" },
      signedUrl: { signedUrl: "https://storage.example/teaser-redirect" },
    });
    authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

    const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://storage.example/teaser-redirect");
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });

  it("returns 500 when signed URL generation fails", async () => {
    const supabase = createTeaserSupabase({
      deal: { id: "deal-1", status: "active", teaser_document_path: "deal-1/teaser.pdf" },
      signedUrl: null,
      signedUrlError: { message: "storage unavailable" },
    });
    authMocks.requireRole.mockResolvedValue({ supabase, user: { id: "buyer-1" }, profile: { role: "buyer" } });

    const response = await GET(new Request("http://localhost/api/deals/deal-1/teaser?format=json"), {
      params: { id: "deal-1" },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to access teaser document" });
  });
});
