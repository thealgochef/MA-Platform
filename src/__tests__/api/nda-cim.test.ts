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

    it("NDA POST should enforce GET availability rules before sign or decline", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("NDA_AVAILABLE_STAGES");
      expect(content).toContain("nda_status !== \"sent\"");
      expect(content).toContain("NDA not available");
    });

    it("NDA POST should fail before updating engagement NDA artifact path when upload fails", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("uploadError");
      expect(content).toContain("Failed to store signed NDA");
      expect(content).toContain("nda_document_path: ndaPath");
      expect(content).not.toContain("signed_nda_path");
      expect(content.indexOf("if (uploadError)")).toBeLessThan(content.indexOf("nda_document_path: ndaPath"));
    });

    it("NDA POST removes uploaded artifact if engagement update fails", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("createAdminClient");
      expect(content).toContain("adminClient.storage");
      expect(content).toContain("remove([ndaPath])");
      expect(content).toContain("Failed to remove orphaned signed NDA artifact");
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

    it("NDA sign should set signatureDate from server current date, not request payload", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("const { signatureName, signatureTitle, signatureCompany } = parsed.data");
      expect(content).toContain("const signatureDate = new Date().toISOString().split(\"T\")[0]");
      expect(content).not.toContain("const { signatureName, signatureTitle, signatureCompany, signatureDate }");
      expect(content).not.toContain("parsed.data.signatureDate");
    });

    it("NDA GET should include serverDate for client display", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
        "utf-8"
      );

      expect(content).toContain("const serverDate = new Date().toISOString().split(\"T\")[0]");
      expect(content).toContain("serverDate");
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

    it("CIM manual release should require a signed NDA and guard malformed JSON", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "cim", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("Invalid JSON body");
      expect(content).toContain("nda_status");
      expect(content).toContain('engagement.nda_status !== "signed"');
      expect(content).toContain("NDA must be signed before CIM release");
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
      expect(content).toContain("serverDate");
    });

    it("NDA page should render date as read-only text instead of editable input", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("Date *");
      expect(content).toContain("<p className=\"w-full border border-border-gray rounded-md px-3 py-2 text-sm bg-bg-alt text-text\">");
      expect(content).not.toContain("type=\"date\"");
    });

    it("NDA page should display server-sourced date and avoid client-side new Date fallback", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("const [serverDate, setServerDate] = useState<string | null>(null)");
      expect(content).toContain("const displayDate = serverDate ?? \"Server date unavailable\"");
      expect(content).toContain("setServerDate(data.serverDate ?? null)");
      expect(content).not.toContain("const displayDate = serverDate ?? new Date()");
      expect(content).not.toContain("displayDate = new Date(");
    });

    it("NDA page should show explicit messaging when server date is unavailable", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("Server date unavailable");
      expect(content).toContain("Server signing date is currently unavailable.");
    });

    it("NDA page fetchNDA should use try/catch/finally and set user-facing fetch errors", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "nda", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("const fetchNDA = async () => {");
      expect(content).toContain("try {");
      expect(content).toContain("} catch (err) {");
      expect(content).toContain("} finally {");
      expect(content).toContain("setError(\"Unable to load NDA right now. Please try again.\")");
      expect(content).toContain("setLoading(false)");
      expect(content.indexOf("try {")).toBeLessThan(content.indexOf("} catch (err) {") );
      expect(content.indexOf("} catch (err) {")).toBeLessThan(content.indexOf("} finally {") );
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
