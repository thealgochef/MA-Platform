import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 8: Marketing Homepage & Shared Deal Links", () => {
  // ─── Marketing Homepage ─────────────────────────────────────────
  describe("Marketing Homepage (/)", () => {
    it("should have homepage at app/page.tsx", () => {
      expect(fs.existsSync(path.join(SRC, "app", "page.tsx"))).toBe(true);
    });

    it("homepage should have navigation with For Buyers tab", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("For Buyers");
    });

    it("homepage should have navigation with For Brokers tab", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("For Brokers");
    });

    it("homepage should have navigation with About tab", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("About");
    });

    it("homepage should have navigation with How It Works tab", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("How It Works");
    });

    it("homepage should have Sign Up / Log In link", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("/login");
    });

    it("homepage should have Geneva Holdings branding", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("Geneva Holdings");
    });

    it("homepage should have hero section with value proposition", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("M&A");
    });

    it("homepage should have footer with About, Contact, Terms, Privacy links", () => {
      const content = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf-8");
      expect(content).toContain("Terms");
      expect(content).toContain("Privacy");
    });
  });

  // ─── For Buyers Page ─────────────────────────────────────────────
  describe("For Buyers Page", () => {
    it("should have For Buyers page at (public)/for-buyers/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "for-buyers", "page.tsx"))
      ).toBe(true);
    });

    it("For Buyers page should highlight 1.25% flat success fee", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "for-buyers", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("1.25%");
    });

    it("For Buyers page should compare to Lehman formula", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "for-buyers", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Lehman");
    });

    it("For Buyers page should describe how the platform works for buyers", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "for-buyers", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("buyer");
    });
  });

  // ─── For Brokers Page ─────────────────────────────────────────────
  describe("For Brokers Page", () => {
    it("should have For Brokers page at (public)/for-brokers/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "for-brokers", "page.tsx"))
      ).toBe(true);
    });

    it("For Brokers page should highlight free to post", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "for-brokers", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("free");
    });

    it("For Brokers page should highlight 0.25% incentive", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "for-brokers", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("0.25%");
    });

    it("For Brokers page should describe how the platform works for brokers", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "for-brokers", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("broker");
    });
  });

  // ─── About Page ─────────────────────────────────────────────────
  describe("About Page", () => {
    it("should have About page at (public)/about/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "about", "page.tsx"))
      ).toBe(true);
    });

    it("About page should have mission content", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "about", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("mission");
    });
  });

  // ─── How It Works Page ─────────────────────────────────────────
  describe("How It Works Page", () => {
    it("should have How It Works page at (public)/how-it-works/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "how-it-works", "page.tsx"))
      ).toBe(true);
    });

    it("How It Works page should show 6-step flow", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "how-it-works", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Create your profile");
      expect(content).toContain("membership agreement");
      expect(content).toContain("approved");
    });

    it("How It Works page should mention NDAs and CIMs", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "how-it-works", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("NDA");
      expect(content).toContain("CIM");
    });
  });

  // ─── Shared Deal Page ─────────────────────────────────────────
  describe("Shared Deal Landing Page", () => {
    it("should have shared deal page at (public)/shared/[dealId]/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "shared", "[dealId]", "page.tsx"))
      ).toBe(true);
    });

    it("shared deal page should display 'shared a deal with you' message", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "shared", "[dealId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("shared a deal with you");
    });

    it("shared deal page should have About the Platform section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "shared", "[dealId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("About the Platform");
    });

    it("shared deal page should have How It Works section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "shared", "[dealId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("How It Works");
    });

    it("shared deal page should have contact form (name, email, message)", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "shared", "[dealId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("contactName");
      expect(content).toContain("contactEmail");
      expect(content).toContain("contactMessage");
    });

    it("shared deal page should have Sign Up CTA", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(public)", "shared", "[dealId]", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Sign Up to View This Deal");
    });
  });

  // ─── Footer Placeholder Pages ─────────────────────────────────
  describe("Footer Pages", () => {
    it("should have Terms of Service page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "terms", "page.tsx"))
      ).toBe(true);
    });

    it("should have Privacy Policy page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "privacy", "page.tsx"))
      ).toBe(true);
    });

    it("should have Contact page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "contact", "page.tsx"))
      ).toBe(true);
    });
  });

  // ─── No Pricing Page ─────────────────────────────────────────
  describe("No Pricing Page", () => {
    it("should NOT have a separate pricing page", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(public)", "pricing", "page.tsx"))
      ).toBe(false);
    });
  });
});
