import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 3: Deal Creation & Management", () => {
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
