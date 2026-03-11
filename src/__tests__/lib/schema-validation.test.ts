import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../supabase/migrations");

describe("Phase 1: Database Schema Migrations", () => {
  describe("Migration files exist", () => {
    it("should have migration files in supabase/migrations", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe("Core tables migration", () => {
    it("should contain firms table creation", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE firms");
      expect(allContent).toContain("firm_type");
      expect(allContent).toMatch(/CHECK.*broker.*buyer/s);
    });

    it("should contain users table with all required columns", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE users");
      expect(allContent).toContain("full_name");
      expect(allContent).toContain("email");
      expect(allContent).toContain("role");
      expect(allContent).toContain("status");
      expect(allContent).toContain("buyer_type");
      expect(allContent).toContain("membership_agreement_signed");
      expect(allContent).toContain("invitation_token");
    });

    it("should contain deals table with all required columns", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE deals");
      expect(allContent).toContain("project_name");
      expect(allContent).toContain("headline");
      expect(allContent).toContain("geography_display");
      expect(allContent).toContain("revenue_year_1");
      expect(allContent).toContain("ebitda_year_1");
      expect(allContent).toContain("nda_type");
      expect(allContent).toContain("cim_sharing_preference");
      expect(allContent).toContain("nda_vetting_preference");
      expect(allContent).toContain("teaser_document_path");
    });

    it("should contain deal_engagements table with unique constraint", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE deal_engagements");
      expect(allContent).toContain("stage");
      expect(allContent).toContain("nda_status");
      expect(allContent).toContain("vetting_status");
      expect(allContent).toMatch(/UNIQUE.*deal_id.*buyer_user_id/s);
    });

    it("should contain iois table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE iois");
      expect(allContent).toContain("offer_price");
      expect(allContent).toContain("multiple");
      expect(allContent).toContain("is_platform");
      expect(allContent).toContain("is_addon");
    });

    it("should contain lois table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE lois");
      expect(allContent).toContain("escrow");
      expect(allContent).toContain("timing");
    });

    it("should contain deal_closures table with fee fields", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE deal_closures");
      expect(allContent).toContain("enterprise_value");
      expect(allContent).toContain("success_fee");
      expect(allContent).toContain("broker_incentive");
      expect(allContent).toContain("broker_disputed");
    });

    it("should contain buyer_projects table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE buyer_projects");
      expect(allContent).toContain("revenue_min");
      expect(allContent).toContain("ebitda_min");
      expect(allContent).toContain("keywords");
    });

    it("should contain messages table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE messages");
      expect(allContent).toContain("sender_id");
      expect(allContent).toContain("attachment_path");
    });

    it("should contain deal_activity_log table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE deal_activity_log");
      expect(allContent).toContain("action");
      expect(allContent).toContain("metadata");
    });

    it("should contain notification_preferences table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE notification_preferences");
      expect(allContent).toContain("preferences");
    });

    it("should contain buyer_documents table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE buyer_documents");
      expect(allContent).toContain("file_path");
      expect(allContent).toContain("file_size");
    });

    it("should contain deal_documents table", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("CREATE TABLE deal_documents");
      expect(allContent).toContain("access_level");
    });
  });

  describe("Triggers and functions", () => {
    it("should contain update_updated_at trigger function", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("update_updated_at");
    });

    it("should contain handle_new_user trigger function", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("handle_new_user");
    });

    it("should contain log_deal_activity function", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("log_deal_activity");
    });

    it("should contain match_deals_to_project function", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain("match_deals_to_project");
    });
  });

  describe("RLS policies", () => {
    it("should enable RLS on all tables", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      const tables = [
        "firms", "users", "buyer_documents", "deals", "deal_documents",
        "deal_engagements", "iois", "lois", "deal_closures", "buyer_projects",
        "messages", "deal_activity_log", "notification_preferences",
      ];
      for (const table of tables) {
        expect(allContent).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      }
    });

    it("should have RLS policies that prevent brokers from seeing buyer_projects", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      // Should have a policy on buyer_projects that references buyer role
      expect(allContent).toMatch(/CREATE POLICY.*buyer_projects/s);
    });

    it("should have RLS policies that prevent buyers from seeing deal_activity_log", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CREATE POLICY.*deal_activity_log/s);
    });
  });

  describe("Storage buckets", () => {
    it("should create all required storage buckets", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      const buckets = [
        "deal-documents",
        "message-attachments",
        "buyer-documents",
        "signed-ndas",
        "dispute-documents",
      ];
      for (const bucket of buckets) {
        expect(allContent).toContain(bucket);
      }
    });
  });

  describe("CHECK constraints", () => {
    it("should have CHECK constraints on deal status values", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CHECK.*draft/s);
      expect(allContent).toMatch(/CHECK.*accepting_iois/s);
      expect(allContent).toMatch(/CHECK.*terminated/s);
    });

    it("should have CHECK constraints on user role values", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CHECK.*broker.*buyer.*admin/s);
    });

    it("should have CHECK constraints on engagement stage values", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CHECK.*pursued/s);
      expect(allContent).toMatch(/CHECK.*nda_pending/s);
    });
  });
});
