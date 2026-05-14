import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../../../");
const SRC = path.join(ROOT, "src");

describe("Phase 0: Project Scaffolding & Infrastructure", () => {
  describe("Project structure", () => {
    it("should have src/app directory", () => {
      expect(fs.existsSync(path.join(SRC, "app"))).toBe(true);
    });

    it("should have src/components directory with required subdirectories", () => {
      const subdirs = ["ui", "layout", "broker", "buyer", "deals", "messages", "marketing"];
      for (const dir of subdirs) {
        expect(fs.existsSync(path.join(SRC, "components", dir))).toBe(true);
      }
    });

    it("should have src/lib directory with required files", () => {
      const files = ["constants.ts", "utils.ts", "validators.ts", "matching.ts", "notifications.ts"];
      for (const file of files) {
        expect(fs.existsSync(path.join(SRC, "lib", file))).toBe(true);
      }
    });

    it("should have src/lib/supabase directory with client files", () => {
      const files = ["client.ts", "server.ts", "admin.ts", "middleware.ts"];
      for (const file of files) {
        expect(fs.existsSync(path.join(SRC, "lib", "supabase", file))).toBe(true);
      }
    });

    it("should have src/types directory", () => {
      expect(fs.existsSync(path.join(SRC, "types"))).toBe(true);
    });

    it("should have src/hooks directory", () => {
      expect(fs.existsSync(path.join(SRC, "hooks"))).toBe(true);
    });

    it("should have src/__tests__ directory with subdirectories", () => {
      const subdirs = ["api", "e2e", "lib"];
      for (const dir of subdirs) {
        expect(fs.existsSync(path.join(SRC, "__tests__", dir))).toBe(true);
      }
    });

    it("should have route group directories for public, auth, shared, admin", () => {
      const groups = ["(public)", "(auth)", "(admin)"];
      for (const group of groups) {
        expect(fs.existsSync(path.join(SRC, "app", group))).toBe(true);
      }
    });

    it("should have supabase/migrations directory", () => {
      expect(fs.existsSync(path.join(ROOT, "supabase", "migrations"))).toBe(true);
    });
  });

  describe("Configuration files", () => {
    it("should have vitest.config.ts", () => {
      expect(fs.existsSync(path.join(ROOT, "vitest.config.ts"))).toBe(true);
    });

    it("should have playwright.config.ts", () => {
      expect(fs.existsSync(path.join(ROOT, "playwright.config.ts"))).toBe(true);
    });

    it("should have Dockerfile", () => {
      expect(fs.existsSync(path.join(ROOT, "Dockerfile"))).toBe(true);
    });

    it("should have docker-compose.yml", () => {
      expect(fs.existsSync(path.join(ROOT, "docker-compose.yml"))).toBe(true);
    });

    it("should have .env.local.example", () => {
      expect(fs.existsSync(path.join(ROOT, ".env.local.example"))).toBe(true);
    });

    it("should have next.config.mjs with standalone output", () => {
      const content = fs.readFileSync(path.join(ROOT, "next.config.mjs"), "utf-8");
      expect(content).toContain("standalone");
    });
  });

  describe("Tailwind theme", () => {
    it("should define theme color tokens in tailwind.config.ts", () => {
      const content = fs.readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf-8");
      expect(content).toContain("var(--color-bg)");
      expect(content).toContain("var(--color-bg-alt)");
      expect(content).toContain("var(--color-surface)");
      expect(content).toContain("var(--color-surface-alt)");
      expect(content).toContain("var(--color-text)");
      expect(content).toContain("var(--color-primary)");
      expect(content).toContain("var(--color-secondary)");
      expect(content).toContain("var(--color-btn-hover)");
      expect(content).toContain("var(--color-subtle)");
      expect(content).toContain("var(--color-faint)");
      expect(content).toContain("#10B981"); // success fallback
      expect(content).toContain("#EF4444"); // error fallback
      expect(content).toContain("#F59E0B"); // warning fallback
      expect(content).toContain("#3B82F6"); // info fallback
    });

    it("should use app font variables in tailwind config", () => {
      const content = fs.readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf-8");
      expect(content).toContain("--font-body");
      expect(content).toContain("--font-display");
    });
  });

  describe("Layout", () => {
    it("should use Outfit and Cormorant Garamond fonts from next/font/google in root layout", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "layout.tsx"), "utf-8");
      expect(content).toContain("--font-body");
      expect(content).toContain("--font-display");
      expect(content).toContain("Outfit");
      expect(content).toContain("Cormorant_Garamond");
      expect(content).toContain("next/font/google");
    });

    it("should have Geneva Holdings in the metadata", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "layout.tsx"), "utf-8");
      expect(content).toContain("Geneva Holdings");
    });
  });

  describe("Test setup", () => {
    it("should have test-setup.ts with jest-dom import", () => {
      const content = fs.readFileSync(path.join(SRC, "test-setup.ts"), "utf-8");
      expect(content).toContain("@testing-library/jest-dom");
    });
  });

  describe("Package.json scripts", () => {
    it("should have test scripts defined", () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
      expect(pkg.scripts.test).toBe("vitest run");
      expect(pkg.scripts["test:watch"]).toBe("vitest");
      expect(pkg.scripts["test:coverage"]).toBe("vitest run --coverage");
      expect(pkg.scripts["test:e2e"]).toBe("playwright test");
      expect(pkg.scripts["test:ui"]).toBe("vitest --ui");
    });
  });

  describe("Constants", () => {
    it("should export INDUSTRIES, REGIONS, US_STATES, BUYER_TYPES", async () => {
      const constants = await import("@/lib/constants");
      expect(constants.INDUSTRIES.length).toBeGreaterThan(0);
      expect(constants.REGIONS.length).toBeGreaterThan(0);
      expect(constants.US_STATES.length).toBe(50);
      expect(constants.BUYER_TYPES.length).toBe(9);
      expect(constants.BUYER_TYPE_VALUES).toEqual(constants.BUYER_TYPES.map((bt) => bt.value));
      expect(constants.BUYER_TYPE_VALUES).toContain("individual_investor");
      expect(constants.BUYER_TYPE_VALUES).not.toContain("private_investor");
    });

    it("should export DEAL_STATUSES with correct values", async () => {
      const constants = await import("@/lib/constants");
      expect(constants.DEAL_STATUSES).toContain("draft");
      expect(constants.DEAL_STATUSES).toContain("accepting_iois");
      expect(constants.DEAL_STATUSES).toContain("closed");
      expect(constants.DEAL_STATUSES).toContain("terminated");
      expect(constants.ACTIVE_DEAL_STATUSES).toEqual(["accepting_iois", "accepting_lois", "under_loi"]);
    });

    it("should export VALID_DEAL_TRANSITIONS", async () => {
      const constants = await import("@/lib/constants");
      expect(constants.VALID_DEAL_TRANSITIONS.draft).toEqual(["accepting_iois"]);
      expect(constants.VALID_DEAL_TRANSITIONS.closed).toEqual([]);
      expect(constants.VALID_DEAL_TRANSITIONS.terminated).toEqual([]);
    });

    it("should export FILE_CONSTRAINTS with 50MB limit and PDF only", async () => {
      const constants = await import("@/lib/constants");
      expect(constants.FILE_CONSTRAINTS.MAX_SIZE_BYTES).toBe(50 * 1024 * 1024);
      expect(constants.FILE_CONSTRAINTS.ALLOWED_TYPES).toEqual(["application/pdf"]);
    });

    it("should export FEE_RATES (1.25% success fee, 0.25% broker incentive)", async () => {
      const constants = await import("@/lib/constants");
      expect(constants.FEE_RATES.SUCCESS_FEE).toBe(0.0125);
      expect(constants.FEE_RATES.BROKER_INCENTIVE).toBe(0.0025);
    });
  });

  describe("Validators", () => {
    it("should validate broker signup data", async () => {
      const { brokerSignupSchema } = await import("@/lib/validators");

      const validData = {
        firstName: "John",
        lastName: "Doe",
        title: "Managing Director",
        phoneNumber: "(555) 123-4567",
        linkedIn: "https://www.linkedin.com/in/johndoe",
        firmName: "Acme Advisors",
        firmWebsite: "https://acme.com",
        location: "New York",
        licenseCredentials: "Series 79",
        firmDescription: "M&A advisory firm",
        dealTypes: "Lower middle market",
        industryFocus: ["Technology"],
        membershipAgreementSigned: true as const,
        signature: "John Doe",
      };

      const result = brokerSignupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject broker signup with missing required fields", async () => {
      const { brokerSignupSchema } = await import("@/lib/validators");

      const result = brokerSignupSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should validate buyer signup data", async () => {
      const { BUYER_TYPE_VALUES } = await import("@/lib/constants");
      const { buyerSignupSchema } = await import("@/lib/validators");

      const validData = {
        firstName: "Jane",
        lastName: "Smith",
        title: "Director of Investments",
        phoneNumber: "(555) 987-6543",
        linkedIn: "https://www.linkedin.com/in/janesmith",
        firmName: "PE Partners",
        firmWebsite: "https://pepartners.com",
        location: "Chicago",
        firmType: "pe" as const,
        firmDescription: "Private equity firm",
        accreditation: "income" as const,
        industryFocus: ["Healthcare"],
        aum: "$500M",
        membershipAgreementSigned: true as const,
        signature: "Jane Smith",
        documentPaths: [],
      };

      const result = buyerSignupSchema.safeParse(validData);
      expect(result.success).toBe(true);

      for (const firmType of BUYER_TYPE_VALUES) {
        const requiresDocuments =
          firmType === "search_fund" || firmType === "individual_investor";
        expect(
          buyerSignupSchema.safeParse({
            ...validData,
            firmType,
            documentPaths: requiresDocuments
              ? [{ fileName: "supporting-doc.pdf", filePath: "123e4567-e89b-12d3-a456-426614174000/supporting-doc.pdf", fileSize: 1024 }]
              : [],
          }).success
        ).toBe(true);
      }

      expect(buyerSignupSchema.safeParse({ ...validData, firmType: "private_investor" }).success).toBe(false);
    });

    it("should reject buyer signup without membership agreement", async () => {
      const { buyerSignupSchema } = await import("@/lib/validators");

      const result = buyerSignupSchema.safeParse({
        firstName: "Jane",
        lastName: "Smith",
        firmName: "PE Partners",
        firmWebsite: "https://pepartners.com",
        location: "Chicago",
        firmType: "pe",
        firmDescription: "Private equity firm",
        industryFocus: ["Healthcare"],
        aum: "$500M",
        membershipAgreementSigned: false,
      });
      expect(result.success).toBe(false);
    });

    it("should require supporting documents for individual investors", async () => {
      const { buyerSignupSchema } = await import("@/lib/validators");

      const result = buyerSignupSchema.safeParse({
        firstName: "Jane",
        lastName: "Smith",
        title: "Investor",
        phoneNumber: "(555) 987-6543",
        linkedIn: "",
        firmName: "Smith Capital",
        firmWebsite: "",
        location: "Chicago",
        firmType: "individual_investor",
        firmDescription: "Private investor",
        accreditation: "income",
        industryFocus: ["Healthcare"],
        aum: "$10M",
        membershipAgreementSigned: true,
        signature: "Jane Smith",
        documentPaths: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Matching algorithm stub", () => {
    it("should export matchDealsToProject function", async () => {
      const { matchDealsToProject } = await import("@/lib/matching");
      expect(typeof matchDealsToProject).toBe("function");
    });

    it("should filter deals by active status", async () => {
      const { ACTIVE_DEAL_STATUSES } = await import("@/lib/constants");
      const { matchDealsToProject } = await import("@/lib/matching");

      const deals = [
        ...ACTIVE_DEAL_STATUSES.map((status, index) => ({
          id: `${index + 1}`, industry: "Tech", status,
          headline: "Tech company", description: "Description",
        })),
        {
          id: "inactive", industry: "Tech", status: "draft",
          headline: "Draft deal", description: "Description",
        },
      ];

      const result = matchDealsToProject(deals, {});
      expect(result.map((deal) => deal.status)).toEqual(ACTIVE_DEAL_STATUSES);
    });
  });

  describe("Utility functions", () => {
    it("should format currency correctly", async () => {
      const { formatCurrency } = await import("@/lib/utils");
      expect(formatCurrency(1000000)).toBe("$1,000,000");
      expect(formatCurrency(0)).toBe("$0");
    });

    it("should format numbers correctly", async () => {
      const { formatNumber } = await import("@/lib/utils");
      expect(formatNumber(1000000)).toBe("1,000,000");
    });
  });

  describe("Notification placeholders", () => {
    it("should export placeholder notification functions", async () => {
      const notifications = await import("@/lib/notifications");
      expect(typeof notifications.notifyAdmin).toBe("function");
      expect(typeof notifications.notifyBroker).toBe("function");
      expect(typeof notifications.notifyBuyer).toBe("function");
      expect(typeof notifications.notifyBuyers).toBe("function");
    });
  });
});
