import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

const supabaseServerMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: supabaseServerMocks.createClient,
}));

import { GET } from "@/app/api/deals/route";

const SRC = path.resolve(__dirname, "../../");

function createBrokerDealsSupabaseMock(options: {
  profileRole?: string;
  profileStatus?: string;
  profileFirmId?: string | null;
  deals?: Array<Record<string, unknown>>;
  engagementRows?: Array<Record<string, unknown>>;
}) {
  const {
    profileRole = "broker",
    profileStatus = "approved",
    profileFirmId = "firm-1",
    deals = [],
    engagementRows = [],
  } = options;

  const usersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        role: profileRole,
        status: profileStatus,
        firm_id: profileFirmId,
      },
      error: null,
    }),
  };

  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: deals, error: null }),
  };

  let engagementInCallCount = 0;
  const dealEngagementsQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockImplementation(() => {
      engagementInCallCount += 1;
      if (engagementInCallCount < 2) {
        return dealEngagementsQuery;
      }
      return Promise.resolve({ data: engagementRows, error: null });
    }),
  };

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "users") return usersQuery;
      if (table === "deals") return dealsQuery;
      if (table === "deal_engagements") return dealEngagementsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, usersQuery, dealsQuery, dealEngagementsQuery };
}

describe("Phase 3: Deal Creation & Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Deal Validators", () => {
    it("should export dealCreateSchema from validators", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("dealCreateSchema");
    });

    it("should require projectName, headline, description, industry in dealCreateSchema", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("projectName");
      expect(content).toContain("headline");
      expect(content).toContain("description");
      expect(content).toContain("industry");
    });

    it("should have geographyDisplayPreference with state/region validation", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("geographyDisplay");
      expect(content).toContain("state");
      expect(content).toContain("region");
    });

    it("should have NDA and CIM preference fields", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("ndaType");
      expect(content).toContain("cimSharingPreference");
      expect(content).toContain("ndaVettingPreference");
    });

    it("should export dealPublishSchema that requires CIM", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("dealPublishSchema");
      expect(content).toContain("cimDocumentPath");
    });

    it("dealStatusUpdateSchema accepts a winning engagement for close transitions", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("winningEngagementId");
      expect(content).toContain("z.string().uuid().optional()");
    });
  });

  describe("Deal API Routes", () => {
    it("broker GET derives pending action metadata from NDA/CIM preference + stage matrix", async () => {
      const mock = createBrokerDealsSupabaseMock({
        deals: [
          {
            id: "deal-nda-manual",
            project_name: "Proj A",
            headline: "Headline A",
            status: "active",
            industry: "Healthcare",
            view_count: 10,
            published_at: "2026-01-01T00:00:00.000Z",
            revenue_year_3: 120,
            ebitda_year_3: 20,
            nda_vetting_preference: "manual",
            cim_sharing_preference: "auto",
          },
          {
            id: "deal-cim-manual",
            project_name: "Proj B",
            headline: "Headline B",
            status: "active",
            industry: "Industrial",
            view_count: 8,
            published_at: "2026-01-01T00:00:00.000Z",
            revenue_year_3: 90,
            ebitda_year_3: 12,
            nda_vetting_preference: "auto",
            cim_sharing_preference: "manual",
          },
          {
            id: "deal-both-auto",
            project_name: "Proj C",
            headline: "Headline C",
            status: "active",
            industry: "Software",
            view_count: 5,
            published_at: "2026-01-01T00:00:00.000Z",
            revenue_year_3: 60,
            ebitda_year_3: 9,
            nda_vetting_preference: "auto",
            cim_sharing_preference: "auto",
          },
          {
            id: "deal-manual-no-stage",
            project_name: "Proj D",
            headline: "Headline D",
            status: "active",
            industry: "Business Services",
            view_count: 6,
            published_at: "2026-01-01T00:00:00.000Z",
            revenue_year_3: 75,
            ebitda_year_3: 11,
            nda_vetting_preference: "manual",
            cim_sharing_preference: "manual",
          },
          {
            id: "deal-both-manual",
            project_name: "Proj E",
            headline: "Headline E",
            status: "active",
            industry: "Energy",
            view_count: 7,
            published_at: "2026-01-01T00:00:00.000Z",
            revenue_year_3: 80,
            ebitda_year_3: 14,
            nda_vetting_preference: "manual",
            cim_sharing_preference: "manual",
          },
        ],
        engagementRows: [
          { deal_id: "deal-nda-manual", stage: "nda_pending" },
          { deal_id: "deal-cim-manual", stage: "nda_signed" },
          { deal_id: "deal-both-auto", stage: "nda_pending" },
          { deal_id: "deal-both-manual", stage: "nda_pending" },
          { deal_id: "deal-both-manual", stage: "nda_signed" },
        ],
      });

      supabaseServerMocks.createClient.mockReturnValue(mock.supabase);

      const response = await GET();
      expect(response.status).toBe(200);
      const payload = await response.json();

      expect(payload.deals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "deal-nda-manual",
            has_pending_actions: true,
            pending_action_type: "release_nda",
          }),
          expect.objectContaining({
            id: "deal-cim-manual",
            has_pending_actions: true,
            pending_action_type: "release_cim",
          }),
          expect.objectContaining({
            id: "deal-both-auto",
            has_pending_actions: false,
            pending_action_type: null,
          }),
          expect.objectContaining({
            id: "deal-manual-no-stage",
            has_pending_actions: false,
            pending_action_type: null,
          }),
          expect.objectContaining({
            id: "deal-both-manual",
            has_pending_actions: true,
            pending_action_type: "release_nda",
          }),
        ])
      );

      expect(JSON.stringify(payload.deals)).not.toContain("deal_engagements");
      expect(mock.supabase.from).toHaveBeenCalledWith("deal_engagements");
      expect(mock.dealEngagementsQuery.select).toHaveBeenCalledWith("deal_id, stage");
    });

    it("GET returns 403 for approved users with unsupported roles", async () => {
      const mock = createBrokerDealsSupabaseMock({
        profileRole: "admin",
      });
      supabaseServerMocks.createClient.mockReturnValue(mock.supabase);

      const response = await GET();
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    });

    it("should have deals list/create route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "route.ts"))
      ).toBe(true);
    });

    it("should have deal get/update route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "route.ts"))
      ).toBe(true);
    });

    it("should have deal status change route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"))
      ).toBe(true);
    });

    it("should have deal documents route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "documents", "route.ts"))
      ).toBe(true);
    });

    it("should have deal buyers pipeline route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "buyers", "route.ts"))
      ).toBe(true);
    });

    it("should have deal timeline route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "timeline", "route.ts"))
      ).toBe(true);
    });

    it("deals list route should filter by firm_id for broker", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("firm_id");
    });

    it("deals create route should require broker role", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("broker");
      expect(content).toContain("approved");
    });

    it("deals create route should set status to draft by default", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("draft");
    });

    it("deals create and update routes should guard invalid JSON bodies", () => {
      const createContent = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );
      const updateContent = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );
      expect(createContent).toContain("Invalid JSON body");
      expect(updateContent).toContain("Invalid JSON body");
    });

    it("deal update route should scope deal document paths to the current deal", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("DEAL_DOCUMENT_FIELDS");
      expect(content).toContain("allowedPrefixes: [params.id]");
      expect(content).toContain("must be a PDF path scoped to this deal");
    });

    it("deal create route should be a draft-only endpoint and reject initial document paths", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("POST /api/deals creates drafts only");
      expect(content).toContain("upload documents under the returned deal ID");
      expect(content).toContain("then publish via the deal status endpoint");
      expect(content).toContain("if (publish)");
      expect(content).toContain("cannot be set during initial draft creation");
      expect(content).not.toContain("allowedPrefixes: [dealId]");
      expect(content).not.toContain("id: dealId");
    });

    it("deal create route does not support client-provided IDs for pre-upload direct publish", () => {
      const validatorContent = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      const routeContent = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );

      expect(validatorContent).not.toContain("dealId: z.string().uuid().optional()");
      expect(routeContent).not.toContain("data.dealId");
      expect(routeContent).not.toContain("Support clients that pre-generate a deal ID");
    });

    it("deal creation page should upload documents only after receiving a deal ID", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("dealId: string");
      expect(content).toContain("`${dealId}/${type}/${crypto.randomUUID()}.pdf`");
      expect(content).toContain("fetch(`/api/deals/${deal.id}`");
      expect(content).not.toContain("dealId || \"temp\"");
    });

    it("deal status route should validate transitions using isValidDealTransition", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("isValidDealTransition");
    });

    it("deal status route should handle terminate by updating engagements", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("terminated");
      expect(content).toContain("deal_engagements");
    });

    it("deal status route should handle publish by setting published_at", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("published_at");
    });

    it("publishing a custom NDA deal requires an uploaded NDA in the status route and UI", () => {
      const statusContent = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"),
        "utf-8"
      );
      const newPageContent = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );

      expect(statusContent).toContain('deal.nda_type === "custom"');
      expect(statusContent).toContain("Custom NDA is required to publish");
      expect(newPageContent).toContain('formData.ndaType === "custom" && !ndaFile');
    });

    it("buyer deal GET routes use explicit safe selects without protected document paths", () => {
      const listContent = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );
      const detailContent = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );

      expect(listContent).toContain("BUYER_DEAL_LIST_SELECT");
      expect(listContent).toContain(".select(BUYER_DEAL_LIST_SELECT)");
      expect(detailContent).toContain("BUYER_DEAL_DETAIL_SELECT");
      expect(detailContent).toContain(".select(BUYER_DEAL_DETAIL_SELECT)");
      expect(listContent.match(/BUYER_DEAL_LIST_SELECT[\s\S]*?`;/)?.[0]).not.toMatch(/cim_document_path|nda_document_path|teaser_document_path/);
      expect(detailContent.match(/BUYER_DEAL_DETAIL_SELECT[\s\S]*?`;/)?.[0]).not.toMatch(/cim_document_path|nda_document_path|teaser_document_path/);
    });

    it("broker deal list computes pending-actions server-side and does not expose raw engagement arrays", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("has_pending_actions");
      expect(content).toContain("pending_action_type");
      expect(content).toContain('.from("deal_engagements")');
      expect(content).toContain('.select("deal_id, stage")');
      expect(content).not.toContain("deal_engagements (stage)");
    });

    it("deal status route should log activity", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
    });

    it("deal status route requires and atomically closes an eligible winning engagement", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("winningEngagementId is required to close a deal");
      expect(content).toContain('adminClient.rpc("close_deal_with_winning_engagement"');
      expect(content).toContain("p_deal_id: params.id");
      expect(content).toContain("p_engagement_id: winningEngagementId");
      expect(content).not.toContain('.update({ stage: "closed" })');
    });

    it("deal documents route should enforce PDF only", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "documents", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("application/pdf");
    });

    it("deal documents GET should require approved context and enforce broker ownership/admin gate", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "documents", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("requireApprovedUser");
      expect(content).toContain("isAuthResponse(context)");
      expect(content).toContain("requireBrokerDealAccess");
      expect(content).toContain('profile.role === "broker"');
      expect(content).toContain("isAuthResponse(brokerDeal)");
      expect(content).toContain('profile.role !== "admin"');
      expect(content).toContain('error: "Forbidden"');
    });

    it("deal timeline route should query deal_activity_log", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "timeline", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
    });

    it("deal buyers route should return engagements with user and firm data", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "buyers", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_engagements");
      expect(content).toContain("users");
    });

    it("deal detail route should return the current buyer engagement", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_engagements");
      expect(content).toContain("buyer_user_id");
      expect(content).toContain("return NextResponse.json({ deal, engagement");
    });

    it("deal detail route should support broker deletion", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function DELETE");
      expect(content).toContain("Failed to delete deal");
    });

    it("deal DELETE route should use admin client to verify broker ownership", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );
      // Must use the admin client (not the user-scoped client) for profile and deal checks
      expect(content).toContain("createAdminClient");
      expect(content).toContain("adminClient");
      // Must enforce broker + approved status
      expect(content).toContain('role !== "broker"');
      expect(content).toContain('status !== "approved"');
      // Must confirm the deal belongs to the broker's firm before deleting
      expect(content).toContain("deal.firm_id !== profile.firm_id");
    });

    it("deal DELETE route should remove associated storage files before deleting the record", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );
      // Must collect paths from the three document columns on the deal row
      expect(content).toContain("teaser_document_path");
      expect(content).toContain("cim_document_path");
      expect(content).toContain("nda_document_path");
      // Must also collect paths from the deal_documents table
      expect(content).toContain('"deal_documents"');
      expect(content).toContain("file_path");
      // Must call storage.remove on the deal-documents bucket
      expect(content).toContain('"deal-documents"');
      expect(content).toContain(".remove(storagePaths)");
      // Storage removal must happen before the deal record is deleted
      const storageRemoveIndex = content.indexOf(".remove(storagePaths)");
      const dealDeleteIndex = content.indexOf("deleteError");
      expect(storageRemoveIndex).toBeLessThan(dealDeleteIndex);
    });

    it("deal PATCH route should map ndaVettingPreference updates to the nda_vetting_preference DB field", () => {
      const routeContent = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "route.ts"),
        "utf-8"
      );
      const mapperContent = fs.readFileSync(
        path.join(SRC, "server", "deals", "mappers.ts"),
        "utf-8"
      );

      expect(routeContent).toContain("mapDealUpdateDataToDb");
      expect(mapperContent).toContain("data.ndaVettingPreference");
      expect(mapperContent).toContain("updateData.nda_vetting_preference");
    });
  });

  describe("Deal Pages", () => {
    it("should have deal creation page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"))
      ).toBe(true);
    });

    it("should have deal management page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "page.tsx"))
      ).toBe(true);
    });

    it("should have deal edit page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "edit", "page.tsx"))
      ).toBe(true);
    });

    it("should have draft preview page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "preview", "page.tsx"))
      ).toBe(true);
    });

    it("should have IOI comparison page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi-compare", "page.tsx"))
      ).toBe(true);
    });

    it("should have LOI comparison page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "loi-compare", "page.tsx"))
      ).toBe(true);
    });
  });

  describe("Deal Creation Form", () => {
    it("should have project name field (internal only)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("projectName");
      expect(content).toContain("Project Name");
    });

    it("should have headline field (visible to buyers)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("headline");
    });

    it("should have geography display preference with state/region toggle", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("geographyDisplay");
      expect(content).toContain("state");
      expect(content).toContain("region");
    });

    it("should have financials table with 3 years + projection", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("revenue");
      expect(content).toContain("ebitda");
      expect(content).toContain("projection");
    });

    it("should have teaser upload zone", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("teaser");
    });

    it("should have NDA type selection (platform vs custom)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("ndaType");
      expect(content).toContain("platform");
      expect(content).toContain("custom");
    });

    it("should have CIM upload and sharing preference", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("cim");
      expect(content).toContain("cimSharingPreference");
    });

    it("should have NDA vetting preference (auto vs manual)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("ndaVettingPreference");
      expect(content).toContain("auto");
      expect(content).toContain("manual");
    });

    it("should have Save Draft and Publish buttons", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Save Draft");
      expect(content).toContain("Publish");
    });

    it("should have point of contact selector", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("pointOfContact");
    });

    it("should have industry dropdown", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("industry");
      expect(content).toContain("INDUSTRIES");
    });
  });

  describe("Deal Management Page", () => {
    it("should have tab navigation for sections", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Overview");
      expect(content).toContain("Pipeline");
      expect(content).toContain("Offers");
    });

    it("should have status badge and change functionality", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("status");
      expect(content).toContain("DEAL_STATUS_LABELS");
    });

    it("should have documents section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Documents");
    });

    it("should have analytics section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Analytics");
    });

    it("should have timeline section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Timeline");
    });

    it("should have messaging section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Messaging");
    });

    it("should include pipeline Actions column and manual action controls", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Actions");
      expect(content).toContain("Approve");
      expect(content).toContain("Reject");
      expect(content).toContain("Release CIM");
      expect(content).toContain("showVettingActions");
      expect(content).toContain("showReleaseCimAction");
    });

    it("should constrain vetting rejection reasons using shared constants", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("VETTING_REJECTION_REASONS");
      expect(content).toContain("Select NDA rejection reason");
      expect(content).toContain("action: \"reject\"");
    });
  });

  describe("Draft Preview Page", () => {
    it("should show buyer perspective of deal", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "preview", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Preview");
      expect(content).toContain("headline");
    });

    it("should have publish button", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "preview", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Publish");
    });
  });

  describe("IOI Comparison Page", () => {
    it("should display IOI comparison table", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi-compare", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("offer_price");
      expect(content).toContain("multiple");
      expect(content).toContain("earnout");
    });

    it("should show buyer name and firm at top of each column", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi-compare", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("firm");
    });
  });

  describe("LOI Comparison Page", () => {
    it("should display LOI comparison table", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "loi-compare", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("offer_price");
      expect(content).toContain("escrow");
      expect(content).toContain("timing");
    });
  });
});
