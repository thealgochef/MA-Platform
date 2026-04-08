import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 2: Authentication & Onboarding Files", () => {
  describe("Middleware", () => {
    it("should have middleware.ts at src root", () => {
      expect(fs.existsSync(path.join(SRC, "middleware.ts"))).toBe(true);
    });

    it("should have auth-helpers.ts in lib", () => {
      expect(fs.existsSync(path.join(SRC, "lib", "auth-helpers.ts"))).toBe(true);
    });
  });

  describe("Auth callback route", () => {
    it("should have auth callback route file", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "auth", "callback", "route.ts"))
      ).toBe(true);
    });

    it("should exchange code for session in callback", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "auth", "callback", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("exchangeCodeForSession");
    });
  });

  describe("Login page", () => {
    it("should have login page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "login", "page.tsx"))
      ).toBe(true);
    });

    it("should use Google OAuth only (no email/password)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "login", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("google");
      expect(content).not.toContain("signInWithPassword");
      expect(content).not.toContain("type=\"password\"");
    });

    it("should NOT have broker and buyer signup links (role selection happens post-auth)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "login", "page.tsx"),
        "utf-8"
      );
      expect(content).not.toContain("/signup/broker");
      expect(content).not.toContain("/signup/buyer");
    });
  });

  describe("Signup pages", () => {
    it("should have broker signup page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "signup", "broker", "page.tsx"))
      ).toBe(true);
    });

    it("should have buyer signup page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "signup", "buyer", "page.tsx"))
      ).toBe(true);
    });

    it("should have broker signup API route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "signup", "broker", "route.ts"))
      ).toBe(true);
    });

    it("should have buyer signup API route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "signup", "buyer", "route.ts"))
      ).toBe(true);
    });

    it("broker signup form should have membership agreement", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "signup", "broker", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("membership");
    });

    it("buyer signup form should have buyer type selector", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "signup", "buyer", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("firmType");
    });

    it("buyer signup form should conditionally show document upload for search_fund/private_investor", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "signup", "buyer", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("search_fund");
      expect(content).toContain("private_investor");
    });

    it("broker signup API should create firm and update user", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "signup", "broker", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("firms");
      expect(content).toContain("users");
    });

    it("buyer signup API should create firm and update user", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "signup", "buyer", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("firms");
      expect(content).toContain("users");
    });
  });

  describe("Pending approval page", () => {
    it("should have pending approval page", () => {
      expect(
        fs.existsSync(
          path.join(SRC, "app", "(public)", "pending-approval", "page.tsx")
        )
      ).toBe(true);
    });

    it("should display confirmation message", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "pending-approval", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("24 hours");
    });
  });

  describe("Admin page (minimal)", () => {
    it("should have admin page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(admin)", "admin", "page.tsx"))
      ).toBe(true);
    });

    it("should have admin applications API route", () => {
      expect(
        fs.existsSync(
          path.join(SRC, "app", "api", "admin", "applications", "route.ts")
        )
      ).toBe(true);
    });

    it("admin applications route should handle approve and reject", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "admin", "applications", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("approved");
      expect(content).toContain("rejected");
    });

    it("admin page should display team_members_requested", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(admin)", "admin", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("team_members_requested");
      expect(content).toContain("Requested Team Members");
    });
  });

  describe("Invitation flow", () => {
    it("should have admin invitations API route", () => {
      expect(
        fs.existsSync(
          path.join(SRC, "app", "api", "admin", "invitations", "route.ts")
        )
      ).toBe(true);
    });

    it("invitation API should generate invitation token", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "admin", "invitations", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("invitation_token");
      expect(content).toContain("invitationLink");
    });

    it("invitation API should pre-create user record with firm_id", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "admin", "invitations", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("firm_id");
      expect(content).toContain("firmId");
    });

    it("auth callback should handle invitation token", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "auth", "callback", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("invitation_token");
      expect(content).toContain("invitationToken");
    });

    it("admin page should have invitation link generation", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(admin)", "admin", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Generate Invitation Links");
      expect(content).toContain("/api/admin/invitations");
    });
  });

  describe("Signup routes persist team members", () => {
    it("broker signup should save team_members_requested to firm", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "signup", "broker", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("team_members_requested");
    });

    it("buyer signup should save team_members_requested to firm", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "signup", "buyer", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("team_members_requested");
    });
  });

  describe("Buyer document upload", () => {
    it("buyer signup form should upload documents to Supabase Storage", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "signup", "buyer", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("buyer-documents");
      expect(content).toContain(".storage");
      expect(content).toContain(".upload");
    });

    it("buyer signup API should create buyer_documents records", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "signup", "buyer", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("buyer_documents");
      expect(content).toContain("documentPaths");
    });
  });

  describe("Migration for team_members_requested", () => {
    it("should have migration file for team_members_requested column", () => {
      expect(
        fs.existsSync(
          path.join(SRC, "..", "supabase", "migrations", "00008_firms_team_members.sql")
        )
      ).toBe(true);
    });

    it("migration should add team_members_requested to firms", () => {
      const content = fs.readFileSync(
        path.join(SRC, "..", "supabase", "migrations", "00008_firms_team_members.sql"),
        "utf-8"
      );
      expect(content).toContain("team_members_requested");
      expect(content).toContain("ALTER TABLE firms");
    });
  });
});
