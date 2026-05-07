import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 6: IOI, LOI & Deal Closure", () => {
  // ─── IOI Validators ─────────────────────────────────────────────
  describe("IOI Validator", () => {
    it("should have ioiSubmitSchema in validators.ts", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("ioiSubmitSchema");
    });

    it("ioiSubmitSchema should require offerPrice, multiple, earnout, rollover, cashAtClose, timeToClose", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("offerPrice");
      expect(content).toContain("multiple");
      expect(content).toContain("earnout");
      expect(content).toContain("rollover");
      expect(content).toContain("cashAtClose");
      expect(content).toContain("timeToClose");
    });

    it("ioiSubmitSchema should handle platform/addon toggle with conditional addon URL", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("isPlatform");
      expect(content).toContain("isAddon");
      expect(content).toContain("addonPlatformUrl");
    });

    it("ioiSubmitSchema should have optional fields: escrow, workingCapitalPeg, specialConsiderations", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("escrow");
      expect(content).toContain("workingCapitalPeg");
      expect(content).toContain("specialConsiderations");
    });
  });

  // ─── LOI Validators ─────────────────────────────────────────────
  describe("LOI Validator", () => {
    it("should have loiSubmitSchema in validators.ts", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      expect(content).toContain("loiSubmitSchema");
    });

    it("loiSubmitSchema should require offerPrice, multiple, escrow, timing, earnout, rollover, workingCapitalPeg, cashAtClose", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "validators.ts"), "utf-8");
      // LOI has more required fields than IOI
      expect(content).toContain("loiSubmitSchema");
      expect(content).toContain("timing");
    });
  });

  // ─── IOI API Route ─────────────────────────────────────────────
  describe("IOI API Route", () => {
    it("should have IOI route at /api/deals/[id]/ioi/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"))
      ).toBe(true);
    });

    it("IOI route should handle POST for submission", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function POST");
    });

    it("IOI route should verify buyer is authenticated and approved", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("Unauthorized");
      expect(content).toContain("buyer");
    });

    it("IOI route should check deal status is accepting_iois", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("accepting_iois");
    });

    it("IOI route should check buyer has NDA signed and CIM viewed", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("nda_status");
      expect(content).toContain("signed");
      expect(content).toContain("cim_released");
    });

    it("IOI route should insert into iois table", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain('"iois"');
      expect(content).toContain(".insert");
    });

    it("IOI route should update engagement stage to ioi_submitted", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("ioi_submitted");
      expect(content).toContain("deal_engagements");
    });

    it("IOI route should log activity ioi_submitted", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
      expect(content).toContain("ioi_submitted");
    });

    it("IOI route should call notifyBroker", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("notifyBroker");
    });

    it("IOI route should validate with ioiSubmitSchema", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("ioiSubmitSchema");
    });

    it("IOI route should handle GET to list buyer's IOIs for a deal", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "ioi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function GET");
    });
  });

  // ─── LOI API Route ─────────────────────────────────────────────
  describe("LOI API Route", () => {
    it("should have LOI route at /api/deals/[id]/loi/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"))
      ).toBe(true);
    });

    it("LOI route should handle POST for submission", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function POST");
    });

    it("LOI route should check deal status is accepting_lois", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("accepting_lois");
    });

    it("LOI route should check buyer has IOI submitted", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("ioi_submitted");
    });

    it("LOI route should insert into lois table", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain('"lois"');
      expect(content).toContain(".insert");
    });

    it("LOI route should update engagement stage to loi_submitted", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("loi_submitted");
      expect(content).toContain("deal_engagements");
    });

    it("LOI route should log activity and notify broker", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
      expect(content).toContain("notifyBroker");
    });

    it("LOI route should validate with loiSubmitSchema", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "loi", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("loiSubmitSchema");
    });
  });

  // ─── Deal Closure API Route ─────────────────────────────────────
  describe("Deal Closure API Route", () => {
    it("should have closure route at /api/deals/[id]/close/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"))
      ).toBe(true);
    });

    it("closure route should handle POST for buyer reporting enterprise value", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function POST");
      expect(content).toContain("enterprise_value");
    });

    it("closure route should create deal_closures record", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain('"deal_closures"');
      expect(content).toContain(".insert");
    });

    it("closure route should set buyer_confirmed = true on creation", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("buyer_confirmed");
    });

    it("closure route should require the winning closed buyer engagement to report closure", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("Engagement is not eligible to report closure");
      expect(content).toContain('engagement.stage !== "closed"');
      expect(content).not.toContain('["loi_submitted", "diligence", "closed"].includes');
    });

    it("closure route should handle PATCH for broker confirm/dispute", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function PATCH");
    });

    it("broker confirm should calculate fees (1.25% success fee, 0.25% broker incentive)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("calculateFees");
      expect(content).toContain("success_fee");
      expect(content).toContain("broker_incentive");
    });

    it("broker dispute should set broker_disputed and notify admin", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("broker_disputed");
      expect(content).toContain("notifyAdmin");
    });

    it("closure should terminate all other engagements", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("terminated");
    });

    it("closure should log deal_closed activity", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
      expect(content).toContain("deal_closed");
    });

    it("closure route should handle GET for fetching closure details", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function GET");
    });
  });

  // ─── Buyer Pass (Post-NDA) API Route ─────────────────────────────
  describe("Buyer Pass (Post-NDA) API Route", () => {
    it("should have pass route at /api/deals/[id]/pass/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"))
      ).toBe(true);
    });

    it("pass route should handle POST", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function POST");
    });

    it("pass route should require pass_reason", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("pass_reason");
    });

    it("pass route should verify buyer has NDA signed (post-NDA only)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("nda_status");
      expect(content).toContain("signed");
    });

    it("pass route should set engagement stage to passed (final, no re-engagement)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("passed");
    });

    it("pass route should validate reason is from PASS_REASONS constant", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("PASS_REASONS");
    });

    it("pass route should log buyer_passed and notify broker", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "pass", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("deal_activity_log");
      expect(content).toContain("buyer_passed");
      expect(content).toContain("notifyBroker");
    });
  });

  // ─── Fee Calculation ─────────────────────────────────────────────
  describe("Fee Calculation", () => {
    it("calculateFees should return correct success fee (1.25%)", async () => {
      const { calculateFees } = await import("../../lib/deal-status");
      const { successFee } = calculateFees(10_000_000);
      expect(successFee).toBe(125_000);
    });

    it("calculateFees should return correct broker incentive (0.25%)", async () => {
      const { calculateFees } = await import("../../lib/deal-status");
      const { brokerIncentive } = calculateFees(10_000_000);
      expect(brokerIncentive).toBe(25_000);
    });
  });

  // ─── IOI Submission Page ─────────────────────────────────────────
  describe("IOI Submission Page", () => {
    it("should have IOI page at (auth)/deals/[id]/ioi/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi", "page.tsx"))
      ).toBe(true);
    });

    it("IOI page should have all required form fields", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("offerPrice");
      expect(content).toContain("multiple");
      expect(content).toContain("earnout");
      expect(content).toContain("rollover");
      expect(content).toContain("cashAtClose");
      expect(content).toContain("timeToClose");
    });

    it("IOI page should have platform/addon radio toggle", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Platform");
      expect(content).toContain("Add-On");
    });

    it("IOI page should conditionally show addon platform URL field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("addonPlatformUrl");
    });

    it("IOI page should submit to /api/deals/[id]/ioi", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "ioi", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/deals/");
      expect(content).toContain("/ioi");
    });
  });

  // ─── LOI Submission Page ─────────────────────────────────────────
  describe("LOI Submission Page", () => {
    it("should have LOI page at (auth)/deals/[id]/loi/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "loi", "page.tsx"))
      ).toBe(true);
    });

    it("LOI page should have all required form fields", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "loi", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("offerPrice");
      expect(content).toContain("multiple");
      expect(content).toContain("escrow");
      expect(content).toContain("timing");
      expect(content).toContain("earnout");
      expect(content).toContain("rollover");
      expect(content).toContain("workingCapitalPeg");
      expect(content).toContain("cashAtClose");
    });

    it("LOI page should have platform/addon radio toggle", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "loi", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Platform");
      expect(content).toContain("Add-On");
    });

    it("LOI page should submit to /api/deals/[id]/loi", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "loi", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/deals/");
      expect(content).toContain("/loi");
    });
  });

  // ─── Deal Closure Page ─────────────────────────────────────────
  describe("Deal Closure Page", () => {
    it("should have closure page at (auth)/deals/[id]/close/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "deals", "[id]", "close", "page.tsx"))
      ).toBe(true);
    });

    it("closure page should have enterprise value input", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "close", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("enterpriseValue");
    });

    it("closure page should submit to /api/deals/[id]/close", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "deals", "[id]", "close", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/deals/");
      expect(content).toContain("/close");
    });
  });

  // ─── PASS_REASONS Constant ─────────────────────────────────────
  describe("Pass Reasons", () => {
    it("PASS_REASONS should contain all required reasons", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "constants.ts"), "utf-8");
      expect(content).toContain("PASS_REASONS");
      expect(content).toContain("Not an industry fit");
      expect(content).toContain("Not a business fit");
      expect(content).toContain("Financial profile");
      expect(content).toContain("Valuation expectations");
      expect(content).toContain("Failed bid");
      expect(content).toContain("Other");
    });
  });

  // ─── Dispute Documents ─────────────────────────────────────────
  describe("Dispute Flow", () => {
    it("closure route should handle dispute document upload path", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "deals", "[id]", "close", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("dispute_documents_path");
    });
  });
});
