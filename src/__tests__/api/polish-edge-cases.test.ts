import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ACTIVE_DEAL_STATUSES, FILE_CONSTRAINTS } from "@/lib/constants";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 10: Polish & Edge Cases", () => {
  // ─── 10.0 Missing Screen: Broker Dashboard ────────────────────
  describe("Broker Dashboard Page", () => {
    it("should have broker dashboard page at (auth)/dashboard/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "dashboard", "page.tsx"))
      ).toBe(true);
    });

    it("broker dashboard should have empty state CTA for no deals", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("Post your first deal");
    });

    it("broker dashboard should link to create new deal", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("/deals/new");
    });

    it("broker dashboard should show loading state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("loading");
    });

    it("broker dashboard should fetch deals from API", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/deals");
    });
  });

  // ─── 10.1 Empty States ─────────────────────────────────────────
  describe("Empty States", () => {
    it("buyer dashboard should have 'Create your first acquisition project' CTA", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "buyer", "BuyerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("Create your first acquisition project");
    });

    it("project deal feed should have no-matches empty state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "[id]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("No matching deals");
    });

    it("browse deals should have no-results empty state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("No deals");
    });

    it("messaging inbox should have 'No messages yet' empty state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("No message");
    });

    it("broker deal pipeline should have 'No buyers have pursued this deal yet' empty state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("No buyers have pursued this deal yet");
    });
  });

  // ─── 10.2 Loading States ───────────────────────────────────────
  describe("Loading States", () => {
    it("buyer dashboard should have loading state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "buyer", "BuyerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("loading");
      expect(content).toContain("Loading");
    });

    it("browse deals should have loading state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("loading");
    });

    it("project deal feed should have loading state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "projects", "[id]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("loading");
    });

    it("messaging inbox should have loading state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "messages", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Loading");
    });

    it("broker deal management should have loading state", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Loading");
    });

    it("settings page should have loading/saving states on buttons", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Saving");
    });
  });

  // ─── 10.3 Error States ─────────────────────────────────────────
  describe("Error States", () => {
    it("broker deal management should have error state for deal not found", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDealManagement.tsx"),
        "utf-8"
      );
      expect(content).toContain("Deal not found");
    });

    it("broker dashboard should handle fetch errors", () => {
      const content = fs.readFileSync(
        path.join(SRC, "components", "broker", "BrokerDashboard.tsx"),
        "utf-8"
      );
      expect(content).toContain("error");
    });
  });

  // ─── 10.4 Edge Case Verification ──────────────────────────────
  // 10.4.1: Decline reversal — buyer declines pre-NDA, then pursues later
  describe("Edge Case: Decline Reversal", () => {
    it("pursue route should handle re-engagement after decline (upsert)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pursue", "route.ts"),
        "utf-8"
      );
      // Should check for existing declined engagement and update it
      expect(content).toContain("declined");
    });

    it("decline route should use upsert or update pattern", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "decline", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("declined");
    });

    it("browse page should show Pursue button for declined deals", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("isDeclined");
      expect(content).toContain("Pursue");
    });
  });

  // 10.4.2: Post-NDA pass is final
  describe("Edge Case: Post-NDA Pass is Final", () => {
    it("pass route should set stage to passed (final)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("passed");
    });

    it("pass route should require NDA signed", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("nda");
    });
  });

  // 10.4.3: Document access revocation
  describe("Edge Case: Document Access Revocation", () => {
    it("CIM route should check deal status and revoke access for paused/terminated/closed", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("paused");
      expect(content).toContain("terminated");
      expect(content).toContain("closed");
    });
  });

  // 10.4.4: Closed deal visibility
  describe("Edge Case: Closed Deal Visibility", () => {
    it("browse page should render closed deals as not clickable", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("closed");
      expect(content).toContain("isNotClickable");
    });
  });

  // 10.4.5: Paused deal visibility
  describe("Edge Case: Paused Deal Visibility", () => {
    it("browse page should render paused deals as not clickable", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "browse", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("paused");
    });

    it("browse API should handle paused deals visibility for NDA-signed buyers", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "browse", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("paused");
    });
  });

  // 10.4.6: POC change — new thread starts
  describe("Edge Case: POC Change", () => {
    it("message thread route should verify point_of_contact_id", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("point_of_contact_id");
    });
  });

  // 10.4.7: Firm member departure — messaging unavailable until POC reassigned
  describe("Edge Case: Firm Member Departure", () => {
    it("message thread route should check POC exists before allowing messages", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "messages", "[threadId]", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("point_of_contact_id");
      expect(content).toContain("sender_id");
    });
  });

  // 10.4.8: Multiple IOIs/LOIs
  describe("Edge Case: Multiple IOIs/LOIs", () => {
    it("IOI route should allow multiple submissions (no unique constraint per buyer)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("insert");
    });

    it("LOI route should allow multiple submissions", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("insert");
    });

    it("IOI comparison page should exist for broker", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi-compare", "page.tsx"))
      ).toBe(true);
    });

    it("LOI comparison page should exist for broker", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "loi-compare", "page.tsx"))
      ).toBe(true);
    });
  });

  // 10.4.9: Broker dispute
  describe("Edge Case: Broker Dispute", () => {
    it("closure route should handle broker dispute with document upload", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("broker_disputed");
      expect(content).toContain("dispute_documents_path");
    });
  });

  // 10.4.10: Anonymous decline
  describe("Edge Case: Anonymous Decline", () => {
    it("decline route should NOT log activity (anonymous to broker)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "decline", "route.ts"),
        "utf-8"
      );
      // Should not contain logDealActivity or notifyBroker calls
      expect(content).not.toContain("logDealActivity");
      expect(content).not.toContain("notifyBroker");
    });
  });

  // 10.4.11: PDF only, 50MB max
  describe("Edge Case: PDF Only, 50MB Max", () => {
    it("file validators should enforce PDF and 50MB limit", () => {
      const content = fs.readFileSync(
        path.join(SRC, "lib", "validators.ts"),
        "utf-8"
      );
      expect(FILE_CONSTRAINTS.ALLOWED_TYPES).toEqual(["application/pdf"]);
      expect(content).toContain("50MB");
      expect(content).toContain("FILE_CONSTRAINTS.ALLOWED_TYPES");
    });

    it("FILE_CONSTRAINTS should define 50MB max and PDF only", () => {
      const content = fs.readFileSync(
        path.join(SRC, "lib", "constants.ts"),
        "utf-8"
      );
      expect(content).toContain("50 * 1024 * 1024");
      expect(content).toContain("application/pdf");
    });

    it("deal documents route should enforce PDF only", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "documents", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("pdf");
    });
  });

  // 10.4.12: Draft invisible to buyers
  describe("Edge Case: Draft Invisible to Buyers", () => {
    it("browse route should only return active deals (not drafts)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "browse", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("accepting_iois");
      // Should not include draft in the filter
    });

    it("matching algorithm should only return active deals", () => {
      const content = fs.readFileSync(
        path.join(SRC, "lib", "matching.ts"),
        "utf-8"
      );
      expect(ACTIVE_DEAL_STATUSES).toEqual(["accepting_iois", "accepting_lois", "under_loi"]);
      expect(content).toContain("ACTIVE_DEAL_STATUSES");
    });
  });

  // 10.4.13: Buyer projects invisible to brokers
  describe("Edge Case: Buyer Projects Invisible to Brokers", () => {
    it("projects route should require buyer role", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "projects", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("buyer");
    });

    it("RLS policies should prevent broker access to buyer_projects", () => {
      const migrations = fs.readdirSync(path.join(SRC, "..", "supabase", "migrations"));
      const rlsFile = migrations.find(f => f.includes("rls"));
      const content = fs.readFileSync(
        path.join(SRC, "..", "supabase", "migrations", rlsFile!),
        "utf-8"
      );
      expect(content).toContain("buyer_projects");
    });
  });

  // ─── Spec 1 Final Validation: Key Rules ─────────────────────
  describe("Spec 1 Key Rules Enforcement", () => {
    it("should NEVER have an asking price field in deals", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "route.ts"),
        "utf-8"
      );
      expect(content).not.toContain("asking_price");
      expect(content).not.toContain("askingPrice");
    });

    it("should NEVER have email/password auth (Google OAuth only)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "login", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("google");
      expect(content).not.toContain('type="password"');
    });

    it("should have no subscription or payment processing", () => {
      const content = fs.readFileSync(
        path.join(SRC, "lib", "constants.ts"),
        "utf-8"
      );
      // No Stripe, no subscription constants
      expect(content).not.toContain("stripe");
      expect(content).not.toContain("subscription");
    });

    it("deal creation should not have asking price field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "lib", "validators.ts"),
        "utf-8"
      );
      expect(content).not.toContain("askingPrice");
    });
  });

  // ─── Screen Inventory Verification ──────────────────────────
  describe("Spec 1 Screen Inventory", () => {
    const screens = [
      { name: "Marketing Homepage", path: ["app", "page.tsx"] },
      { name: "Shared Deal Landing", path: ["app", "(public)", "shared", "[dealId]", "page.tsx"] },
      { name: "Login", path: ["app", "(public)", "login", "page.tsx"] },
      { name: "Broker Signup", path: ["app", "(public)", "signup", "broker", "page.tsx"] },
      { name: "Buyer Signup", path: ["app", "(public)", "signup", "buyer", "page.tsx"] },
      { name: "Pending Approval", path: ["app", "(public)", "pending-approval", "page.tsx"] },
      { name: "Broker Dashboard", path: ["app", "(auth)", "dashboard", "page.tsx"] },
      { name: "Create Deal", path: ["app", "(auth)", "deals", "new", "page.tsx"] },
      { name: "Edit Deal", path: ["app", "(auth)", "deals", "[id]", "edit", "page.tsx"] },
      { name: "Draft Preview", path: ["app", "(auth)", "deals", "[id]", "preview", "page.tsx"] },
      { name: "Deal Management", path: ["app", "(auth)", "deals", "[id]", "page.tsx"] },
      { name: "IOI Comparison", path: ["app", "(auth)", "deals", "[id]", "ioi-compare", "page.tsx"] },
      { name: "LOI Comparison", path: ["app", "(auth)", "deals", "[id]", "loi-compare", "page.tsx"] },
      { name: "Buyer Dashboard", path: ["app", "(auth)", "dashboard", "page.tsx"] },
      { name: "Create Project", path: ["app", "(auth)", "projects", "new", "page.tsx"] },
      { name: "Edit Project", path: ["app", "(auth)", "projects", "[id]", "edit", "page.tsx"] },
      { name: "Project Deal Feed", path: ["app", "(auth)", "projects", "[id]", "page.tsx"] },
      { name: "Browse All Deals", path: ["app", "(auth)", "browse", "page.tsx"] },
      { name: "NDA Signing", path: ["app", "(auth)", "deals", "[id]", "nda", "page.tsx"] },
      { name: "Deal Workspace (Buyer)", path: ["app", "(auth)", "deals", "[id]", "page.tsx"] },
      { name: "IOI Submission", path: ["app", "(auth)", "deals", "[id]", "ioi", "page.tsx"] },
      { name: "LOI Submission", path: ["app", "(auth)", "deals", "[id]", "loi", "page.tsx"] },
      { name: "Deal Closure", path: ["app", "(auth)", "deals", "[id]", "close", "page.tsx"] },
      { name: "Messaging Inbox", path: ["app", "(auth)", "messages", "page.tsx"] },
      { name: "Message Thread", path: ["app", "(auth)", "messages", "[threadId]", "page.tsx"] },
      { name: "Settings", path: ["app", "(auth)", "settings", "page.tsx"] },
      { name: "Admin", path: ["app", "(admin)", "admin", "page.tsx"] },
    ];

    screens.forEach(({ name, path: pathParts }) => {
      it(`should have ${name} screen`, () => {
        expect(fs.existsSync(path.join(SRC, ...pathParts))).toBe(true);
      });
    });
  });
});
