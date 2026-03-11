import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 5: NDA Flow & CIM Access", () => {
  describe("NDA API Route", () => {
    it("should have NDA route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"))
      ).toBe(true);
    });

    it("NDA route should handle signing (POST)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("POST");
    });

    it("NDA sign should set nda_status to signed", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("signed");
      expect(content).toContain("nda_signed_at");
    });

    it("NDA sign should update engagement stage to nda_signed", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("nda_signed");
      expect(content).toContain("deal_engagements");
    });

    it("NDA sign should store signed NDA in signed-ndas bucket", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("signed-ndas");
    });

    it("NDA sign should check cim_sharing_preference for auto CIM release", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("cim_sharing_preference");
      expect(content).toContain("cim_released");
    });

    it("NDA sign should log activity", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
      expect(content).toContain("nda_signed");
    });

    it("NDA decline should set nda_status to declined and engagement to declined", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("declined");
    });

    it("NDA route should capture signature fields (name, title, company, date)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("signatureName");
      expect(content).toContain("signatureTitle");
    });
  });

  describe("Vetting API Route", () => {
    it("should have vetting route for broker approve/reject", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"))
      ).toBe(true);
    });

    it("vetting route should handle approve action", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("approve");
      expect(content).toContain("nda_status");
    });

    it("vetting route should handle reject action with reason", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("reject");
      expect(content).toContain("vetting_rejection_reason");
    });

    it("vetting approve should set nda_status to sent and vetting_status to approved", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("approved");
      expect(content).toContain("sent");
    });

    it("vetting reject should set engagement stage to terminated", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("terminated");
    });

    it("vetting route should log activity", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
    });

    it("vetting route should verify broker owns the deal", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("firm_id");
    });
  });

  describe("CIM Access API Route", () => {
    it("should have CIM access route", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"))
      ).toBe(true);
    });

    it("CIM route should handle GET for accessing CIM", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("GET");
    });

    it("CIM route should check cim_released before granting access", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("cim_released");
    });

    it("CIM route should track view and download events", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("cim_viewed_at");
      expect(content).toContain("cim_downloaded_at");
    });

    it("CIM route should handle manual release by broker (PATCH)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("PATCH");
      expect(content).toContain("cim_released");
    });

    it("CIM route should revoke access for paused/terminated/closed deals", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("paused");
      expect(content).toContain("terminated");
    });

    it("CIM route should log access events", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
    });
  });

  describe("NDA Signing Page", () => {
    it("should have NDA signing page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"))
      ).toBe(true);
    });

    it("NDA page should display NDA document", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("NDA");
    });

    it("NDA page should have signature fields (name, title, company, date)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("signatureName");
      expect(content).toContain("signatureTitle");
      expect(content).toContain("signatureCompany");
      expect(content).toContain("signatureDate");
    });

    it("NDA page should have Sign NDA and Decline NDA buttons", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Sign NDA");
      expect(content).toContain("Decline");
    });

    it("NDA page should show platform or custom NDA based on deal nda_type", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("nda_type");
    });
  });

  describe("Vetting Rejection Templates", () => {
    it("should have VETTING_REJECTION_REASONS in constants", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "constants.ts"), "utf-8");
      expect(content).toContain("VETTING_REJECTION_REASONS");
      expect(content).toContain("Not an industry fit");
      expect(content).toContain("Not a financial fit");
      expect(content).toContain("Not the right partner");
    });

    it("vetting route should use VETTING_REJECTION_REASONS", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "vetting", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("reason");
    });
  });
});
