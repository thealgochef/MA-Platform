import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ACTIVE_DEAL_STATUSES } from "@/lib/constants";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 4: Buyer Projects & Deal Discovery", () => {
  describe("Project Validators", () => {
    it("should export projectCreateSchema from validators", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("projectCreateSchema");
    });

    it("should require projectName in projectCreateSchema", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("projectName");
      // Ensure it's in the project schema context
      expect(content).toMatch(/projectCreateSchema[\s\S]*projectName/);
    });

    it("should have revenue and EBITDA range fields", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("revenueMin");
      expect(content).toContain("revenueMax");
      expect(content).toContain("ebitdaMin");
      expect(content).toContain("ebitdaMax");
    });

    it("should have ebitdaMargin field", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("ebitdaMargin");
    });

    it("should have location and keywords fields", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("location");
      expect(content).toContain("keywords");
    });
  });

  describe("Project API Routes", () => {
    it("should have projects list/create route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "projects", "route.ts"))
      ).toBe(true);
    });

    it("should have project get/update/delete route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "projects", "[id]", "route.ts"))
      ).toBe(true);
    });

    it("should have project matches route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "projects", "[id]", "matches", "route.ts"))
      ).toBe(true);
    });

    it("projects list route should require buyer role", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("buyer");
    });

    it("projects list route should filter by user_id", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("user_id");
    });

    it("projects create route should save all criteria fields", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("buyer_projects");
      expect(content).toContain("industry");
    });

    it("project matches route should use matching algorithm", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "[id]", "matches", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("matchDealsToProject");
    });

    it("project matches route should require buyer role before returning matches", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "[id]", "matches", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("requireRole");
      expect(content).toMatch(/requireRole\(["']buyer["']\)/);
      expect(content).toContain("isAuthResponse");
      expect(content).toMatch(/if \(isAuthResponse\(context\)\) return context/);
    });

    it("project matches route should include existing engagements", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "[id]", "matches", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_engagements");
    });

    it("project matches route should return minimized expanded drawer deal and engagement fields", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "[id]", "matches", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("description");
      expect(content).toContain("revenue_year_1");
      expect(content).toContain("ebitda_year_1");
      expect(content).toContain("revenue_projection");
      expect(content).toContain("fiscal_year_labels");
      expect(content).toContain("nda_type");
      expect(content).toContain("cim_sharing_preference");
      expect(content).toContain("nda_vetting_preference");
      expect(content).toContain("has_teaser_document");
      expect(content).toContain("has_cim_document");
      expect(content).toContain("has_nda_document");
      expect(content).toContain("teaser_document_path: teaserDocumentPath");
      expect(content).toContain("cim_document_path: cimDocumentPath");
      expect(content).toContain("nda_document_path: ndaDocumentPath");
      expect(content).toContain("cim_released_at");
      expect(content).toContain("cim_viewed_at");
      expect(content).toContain("pass_reason_detail");
      expect(content).toContain("vetting_rejection_reason");
    });

    it("project matches route should not spread raw storage paths into buyer responses", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "[id]", "matches", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("buildBuyerMatchResponseDeal");
      expect(content).not.toMatch(/\.\.\.deal,\s*engagement/);
      expect(content).toMatch(/const buyerHasCimAccess =[\s\S]*engagement\?\.nda_status === "signed"[\s\S]*engagement\?\.cim_released === true/);
      expect(content).toMatch(/has_cim_document:[\s\S]*buyerHasCimAccess/);
      expect(content).toMatch(/has_nda_document:[\s\S]*ndaHasBeenSentOrSigned/);
    });
  });

  describe("Deal Engagement API Routes", () => {
    it("should have pursue route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "pursue", "route.ts"))
      ).toBe(true);
    });

    it("should have decline route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "decline", "route.ts"))
      ).toBe(true);
    });

    it("pursue route should create deal_engagement", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pursue", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_engagements");
    });

    it("pursue route should check nda_vetting_preference for auto vs manual", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pursue", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("nda_vetting_preference");
    });

    it("pursue route should log activity", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pursue", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
    });

    it("decline route should set engagement stage to declined", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "decline", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("declined");
    });

    it("decline route should be reversible (upsert or update)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "decline", "route.ts"),
        "utf-8"
      );
      // Should use upsert or allow re-pursuit
      expect(content).toContain("deal_engagements");
    });
  });

  describe("Browse Deals API", () => {
    it("should have browse deals route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "browse", "route.ts"))
      ).toBe(true);
    });

    it("browse route should filter by active statuses", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "browse", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("accepting_iois");
    });

    it("browse route should support industry filter", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "browse", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("industry");
    });

    it("browse route should support revenue range filter", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "browse", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("revenue");
    });

    it("browse route should support cursor-based pagination", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "browse", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("cursor");
    });

    it("browse route should handle paused deals visibility for NDA-signed buyers", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "browse", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("paused");
    });
  });

  describe("Buyer Dashboard Page", () => {
    it("should have buyer dashboard page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "dashboard", "page.tsx"))
      ).toBe(true);
    });

    it("should display analytics section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "buyer", "BuyerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("pursuing");
    });

    it("should display project tiles", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "buyer", "BuyerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("projects");
    });

    it("should have empty state with create project CTA", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "buyer", "BuyerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("Create");
    });

    it("should show recent activity feed", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "buyer", "BuyerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("activity");
    });
  });

  describe("Project Creation Page", () => {
    it("should have project creation page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "projects", "new", "page.tsx"))
      ).toBe(true);
    });

    it("should have project name field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("projectName");
    });

    it("should have industry dropdown", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("industry");
      expect(content).toContain("INDUSTRIES");
    });

    it("should have revenue and EBITDA range inputs", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("revenue");
      expect(content).toContain("ebitda");
    });

    it("should have EBITDA margin field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("ebitdaMargin");
    });

    it("should have location dropdown", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("location");
      expect(content).toContain("US_STATES");
    });

    it("should have keywords input", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "new", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("keywords");
    });
  });

  describe("Project Edit Page", () => {
    it("should have project edit page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "projects", "[id]", "edit", "page.tsx"))
      ).toBe(true);
    });

    it("should pre-populate form with existing project data", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "[id]", "edit", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("projectName");
      expect(content).toContain("PATCH");
    });
  });

  describe("Project Deal Feed Page", () => {
    it("should have project deal feed page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "projects", "[id]", "page.tsx"))
      ).toBe(true);
    });

    it("should delegate project deal feed rendering to ProjectDealsView", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "[id]", "page.tsx"),
        "utf-8"
      );

      // Contract: wrapper imports and renders ProjectDealsView with a params-derived project ID.
      expect(content).toMatch(/import\s+ProjectDealsView\s+from\s+["']@\/components\/buyer\/ProjectDealsView["']/);
      expect(content).toMatch(/const\s+params\s*=\s*useParams\(\)/);
      expect(content).toMatch(/<ProjectDealsView\s+projectId=\{params\.id\s+as\s+string\}\s*\/>/);
    });

    it("wrapper should remain thin and delegate instead of local data orchestration", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "[id]", "page.tsx"),
        "utf-8"
      );

      expect(content).toMatch(/return\s*<ProjectDealsView\b/);
      expect(content).not.toMatch(/\buseState\s*\(/);
      expect(content).not.toMatch(/\buseEffect\s*\(/);
      expect(content).not.toMatch(/\bfetch\s*\(/);
    });
  });

  describe("Browse All Deals Page", () => {
    it("should have browse all deals page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "browse", "page.tsx"))
      ).toBe(true);
    });

    it("should have filter controls", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("industry");
      expect(content).toContain("revenue");
    });

    it("should display deals in table format", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("<table");
      expect(content).toContain("Headline");
    });

    it("should have Decline and Pursue actions", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Decline");
      expect(content).toContain("Pursue");
    });

    it("should show closed deals with badge but not clickable", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Closed");
    });
  });

  describe("Matching Algorithm", () => {
    it("should have full matching implementation in matching.ts", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "matching.ts"), "utf-8");
      expect(content).toContain("matchDealsToProject");
      expect(content).toContain("industry");
      expect(content).toContain("revenueMin");
      expect(content).toContain("ebitdaMargin");
      expect(content).toContain("keywords");
    });

    it("should filter only active deal statuses", () => {
      expect(ACTIVE_DEAL_STATUSES).toEqual(["accepting_iois", "accepting_lois", "under_loi"]);
      const content = fs.readFileSync(path.join(SRC, "lib", "matching.ts"), "utf-8");
      expect(content).toContain("ACTIVE_DEAL_STATUSES");
    });
  });
});
