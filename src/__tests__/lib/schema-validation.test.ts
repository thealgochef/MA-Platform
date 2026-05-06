import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { BUYER_TYPE_VALUES, FILE_CONSTRAINTS, SIGNED_NDA_ARTIFACT_CONSTRAINTS } from "@/lib/constants";
import {
  adminInvitationCreateSchema,
  browseQuerySchema,
  closeReportSchema,
  dealDocumentCreateSchema,
  dealStatusUpdateSchema,
  escapePostgrestLikePattern,
  invitationTokenSchema,
  isValidStorageObjectKey,
  mapProjectDataToDb,
  messageCreateSchema,
  ndaActionSchema,
  projectCreateSchema,
  settingsNotificationsUpdateSchema,
  settingsProfileUpdateSchema,
} from "@/lib/validators";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../supabase/migrations");

function parseSqlStringValues(sqlList: string | undefined) {
  return sqlList?.match(/'([^']+)'/g)?.map((value) => value.replaceAll("'", ""));
}

function extractCheckDefinitions(sql: string) {
  const definitions: string[] = [];
  let cursor = 0;

  while (cursor < sql.length) {
    const nextCheck = /\bCHECK\s*\(/.exec(sql.slice(cursor));
    if (!nextCheck) break;

    const checkStart = cursor + nextCheck.index;
    const openParen = checkStart + nextCheck[0].lastIndexOf("(");

    let depth = 0;
    let end = openParen;
    for (; end < sql.length; end += 1) {
      if (sql[end] === "(") depth += 1;
      if (sql[end] === ")") depth -= 1;
      if (depth === 0) break;
    }

    definitions.push(sql.slice(checkStart, end + 1));
    cursor = end + 1;
  }

  return definitions;
}

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
      expect(allContent).toMatch(/CHECK[\s\S]*broker[\s\S]*buyer/);
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
      expect(allContent).toMatch(/UNIQUE[\s\S]*deal_id[\s\S]*buyer_user_id/);
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
      expect(allContent).toMatch(/CREATE POLICY[\s\S]*buyer_projects/);
    });

    it("should have RLS policies that prevent buyers from seeing deal_activity_log", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CREATE POLICY[\s\S]*deal_activity_log/);
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

    it("should allow signed NDA JSON artifacts in the signed-ndas bucket", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toContain(SIGNED_NDA_ARTIFACT_CONSTRAINTS.ALLOWED_TYPE);
      expect(SIGNED_NDA_ARTIFACT_CONSTRAINTS.ALLOWED_EXTENSION).toBe(".json");
    });

    it("should scope signed NDA artifact storage access to signer, broker firm, or admin", () => {
      const correctiveMigration = fs.readFileSync(
        path.join(MIGRATIONS_DIR, "00019_harden_signed_nda_storage_policies.sql"),
        "utf-8"
      );
      expect(correctiveMigration).toContain("(storage.foldername(name))[2] = auth.uid()::text");
      expect(correctiveMigration).toContain("lower(name) LIKE '%.json'");
      expect(correctiveMigration).toContain("JOIN deal_engagements");
      expect(correctiveMigration).toContain("JOIN deals d");
      expect(correctiveMigration).toContain("u.role = 'admin'");
      expect(correctiveMigration).not.toContain('CREATE POLICY "Authenticated users can read signed NDAs"');
    });
  });

  describe("CHECK constraints", () => {
    it("should have CHECK constraints on deal status values", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CHECK[\s\S]*draft/);
      expect(allContent).toMatch(/CHECK[\s\S]*accepting_iois/);
      expect(allContent).toMatch(/CHECK[\s\S]*terminated/);
    });

    it("should have CHECK constraints on user role values", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CHECK[\s\S]*broker[\s\S]*buyer[\s\S]*admin/);
    });

    it("should have CHECK constraints on engagement stage values", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR);
      const allContent = files.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
      expect(allContent).toMatch(/CHECK[\s\S]*pursued/);
      expect(allContent).toMatch(/CHECK[\s\S]*nda_pending/);
    });

    it("should keep canonical buyer types in the corrective users CHECK constraint", () => {
      const correctiveMigration = fs.readFileSync(
        path.join(MIGRATIONS_DIR, "00010_fix_buyer_type_check.sql"),
        "utf-8"
      );
      const checkConstraintValues = parseSqlStringValues(
        correctiveMigration.match(/CHECK \(buyer_type IN \(([\s\S]*?)\)\)/)?.[1]
      );

      expect(checkConstraintValues).toEqual([...BUYER_TYPE_VALUES]);
      expect(checkConstraintValues).toContain("private_investor");
      expect(checkConstraintValues).not.toContain("individual_investor");
    });

    it("should keep canonical buyer types in the destructive reset users CHECK constraint", () => {
      const combinedMigration = fs.readFileSync(
        path.join(MIGRATIONS_DIR, "combined.sql"),
        "utf-8"
      );
      const checkConstraintValues = parseSqlStringValues(
        combinedMigration.match(/buyer_type text CHECK \(buyer_type IN \(([\s\S]*?)\)\)/)?.[1]
      );

      expect(checkConstraintValues).toEqual([...BUYER_TYPE_VALUES]);
      expect(checkConstraintValues).not.toContain("individual_investor");
    });

    it("should not allow legacy individual_investor in migration CHECK definitions", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql"));
      const checkDefinitions = files.flatMap((file) =>
        extractCheckDefinitions(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8"))
          .map((definition) => ({ file, definition }))
      );

      expect(
        checkDefinitions.filter(({ definition }) => definition.includes("individual_investor"))
      ).toEqual([]);
    });
  });
});

describe("Settings profile validation", () => {
  it("rejects invalid buyerType values before database writes", () => {
    expect(settingsProfileUpdateSchema.safeParse({ buyerType: "individual_investor" }).success)
      .toBe(false);
    expect(settingsProfileUpdateSchema.safeParse({ buyerType: "not_a_real_type" }).success)
      .toBe(false);
  });

  it("allows canonical buyerType values and empty values while preserving other keys", () => {
    expect(settingsProfileUpdateSchema.parse({ buyerType: "private_investor" }).buyerType)
      .toBe("private_investor");
    expect(settingsProfileUpdateSchema.parse({ buyerType: "" }).buyerType).toBe("");
    expect(settingsProfileUpdateSchema.parse({ buyerType: null }).buyerType).toBeNull();
    expect(settingsProfileUpdateSchema.parse({ fullName: "Ada Lovelace" }).fullName)
      .toBe("Ada Lovelace");
  });
});

describe("API request validation schemas", () => {
  it("validates notification preference keys and boolean values", () => {
    expect(settingsNotificationsUpdateSchema.safeParse({
      preferences: {
        new_message: { email: true, in_platform: true },
        buyer_pursued_deal: { email: false, in_platform: true },
      },
    }).success).toBe(true);
    expect(settingsNotificationsUpdateSchema.safeParse({
      preferences: { "not-real-event": { email: true, in_platform: true } },
    }).success).toBe(false);
    expect(settingsNotificationsUpdateSchema.safeParse({
      preferences: { new_message: { email: "yes", in_platform: true } },
    }).success).toBe(false);
    expect(settingsNotificationsUpdateSchema.safeParse({
      preferences: { new_message: { email: true, in_platform: true, sms: true } },
    }).success).toBe(false);
  });

  it("normalizes and validates admin invitation payloads", () => {
    const parsed = adminInvitationCreateSchema.parse({
      email: "  Ada@Example.COM ",
      firmId: "00000000-0000-4000-8000-000000000000",
      role: "buyer",
    });

    expect(parsed.email).toBe("ada@example.com");
    expect(adminInvitationCreateSchema.safeParse({
      email: "not-an-email",
      firmId: "00000000-0000-4000-8000-000000000000",
      role: "buyer",
    }).success).toBe(false);
    expect(adminInvitationCreateSchema.safeParse({
      email: "ada@example.com",
      firmId: "not-a-uuid",
      role: "buyer",
    }).success).toBe(false);
    expect(adminInvitationCreateSchema.safeParse({
      email: "ada@example.com",
      firmId: "00000000-0000-4000-8000-000000000000",
      role: "admin",
    }).success).toBe(false);
  });

  it("validates invitation tokens before lookup", () => {
    expect(invitationTokenSchema.safeParse("00000000-0000-4000-8000-000000000000").success).toBe(true);
    expect(invitationTokenSchema.safeParse("abc.def").success).toBe(false);
    expect(invitationTokenSchema.safeParse("00000000-0000-4000-8000-000000000000 OR true").success).toBe(false);
  });

  it("validates safe Supabase storage object keys", () => {
    expect(isValidStorageObjectKey("deal-1/teaser/file.pdf", { requirePdf: true, allowedPrefixes: ["deal-1"] })).toBe(true);
    expect(isValidStorageObjectKey("thread-id/1700000000000_doc.pdf", { requirePdf: true, allowedPrefixes: ["thread-id"] })).toBe(true);
    expect(isValidStorageObjectKey("/deal-1/file.pdf", { requirePdf: true })).toBe(false);
    expect(isValidStorageObjectKey("deal-1//file.pdf", { requirePdf: true })).toBe(false);
    expect(isValidStorageObjectKey("deal-1/../file.pdf", { requirePdf: true })).toBe(false);
    expect(isValidStorageObjectKey("deal-1\\file.pdf", { requirePdf: true })).toBe(false);
    expect(isValidStorageObjectKey("deal-1/file.pdf?download=1", { requirePdf: true })).toBe(false);
    expect(isValidStorageObjectKey("deal-1/file.txt", { requirePdf: true })).toBe(false);
    expect(isValidStorageObjectKey("other/file.pdf", { requirePdf: true, allowedPrefixes: ["deal-1"] })).toBe(false);
  });

  it("restricts deal status and document metadata", () => {
    expect(dealStatusUpdateSchema.safeParse({ newStatus: "accepting_iois" }).success).toBe(true);
    expect(dealStatusUpdateSchema.safeParse({ newStatus: "published" }).success).toBe(false);

    expect(dealDocumentCreateSchema.safeParse({
      fileName: "teaser.pdf",
      filePath: "deal-1/teaser.pdf",
      fileSize: FILE_CONSTRAINTS.MAX_SIZE_BYTES,
      accessLevel: "pre_nda",
    }).success).toBe(true);
    expect(dealDocumentCreateSchema.safeParse({
      fileName: "teaser.docx",
      filePath: "deal-1/teaser.docx",
      fileSize: 1,
      accessLevel: "pre_nda",
    }).success).toBe(false);
    expect(dealDocumentCreateSchema.safeParse({
      fileName: "teaser.pdf",
      filePath: "deal-1/teaser.pdf",
      fileSize: FILE_CONSTRAINTS.MAX_SIZE_BYTES + 1,
      accessLevel: "pre_nda",
    }).success).toBe(false);
  });

  it("requires message content or a PDF attachment", () => {
    expect(messageCreateSchema.parse({ content: "  hello  " }).content).toBe("hello");
    expect(messageCreateSchema.safeParse({
      attachment_path: "thread/doc.pdf",
      attachment_name: "doc.pdf",
    }).success).toBe(true);
    expect(messageCreateSchema.parse({
      attachmentPath: "thread/doc.pdf",
      attachmentName: "doc.pdf",
    }).attachment_path).toBe("thread/doc.pdf");
    expect(messageCreateSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(messageCreateSchema.safeParse({
      attachment_path: "thread/doc.exe",
      attachment_name: "doc.exe",
    }).success).toBe(false);
  });

  it("validates browse query numbers and unsafe keyword characters", () => {
    expect(browseQuerySchema.parse({ revenueMin: "0", keyword: "industrial services" }).revenueMin)
      .toBe(0);
    expect(browseQuerySchema.safeParse({ keyword: "growth_100%" }).success).toBe(true);
    expect(escapePostgrestLikePattern("growth_100%")).toBe("growth\\_100\\%");
    expect(browseQuerySchema.safeParse({ revenueMin: "NaN" }).success).toBe(false);
    expect(browseQuerySchema.safeParse({ keyword: "foo),id.eq.1" }).success).toBe(false);
  });

  it("requires signature fields only for NDA sign actions", () => {
    expect(ndaActionSchema.safeParse({ action: "decline" }).success).toBe(true);
    expect(ndaActionSchema.safeParse({
      action: "sign",
      signatureName: "Ada Lovelace",
      signatureTitle: "Partner",
      signatureCompany: "Example Capital",
      signatureDate: "2026-05-05",
    }).success).toBe(true);
    expect(ndaActionSchema.safeParse({ action: "sign", signatureName: "Ada" }).success).toBe(false);
    expect(ndaActionSchema.safeParse({
      action: "sign",
      signatureName: "A".repeat(121),
      signatureTitle: "Partner",
      signatureCompany: "Example Capital",
      signatureDate: "2026-05-05",
    }).success).toBe(false);
    expect(ndaActionSchema.safeParse({
      action: "sign",
      signatureName: "Ada Lovelace",
      signatureTitle: "Partner",
      signatureCompany: "Example Capital",
      signatureDate: "05/05/2026",
    }).success).toBe(false);
    expect(ndaActionSchema.safeParse({
      action: "sign",
      signatureName: "Ada Lovelace",
      signatureTitle: "Partner",
      signatureCompany: "Example Capital",
      signatureDate: "2026-02-31",
    }).success).toBe(false);
  });

  it("requires realistic finite positive close enterprise values", () => {
    expect(closeReportSchema.safeParse({ enterpriseValue: 1 }).success).toBe(true);
    expect(closeReportSchema.safeParse({ enterpriseValue: 1_000_000_000_000 }).success).toBe(true);
    expect(closeReportSchema.safeParse({ enterpriseValue: 0 }).success).toBe(false);
    expect(closeReportSchema.safeParse({ enterpriseValue: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(closeReportSchema.safeParse({ enterpriseValue: 1_000_000_000_001 }).success).toBe(false);
  });

  it("preserves numeric zero when mapping projects to database fields", () => {
    const parsed = projectCreateSchema.parse({
      projectName: "Zero Floor Project",
      revenueMin: 0,
      revenueMax: 0,
      ebitdaMin: 0,
      ebitdaMax: 0,
      ebitdaMargin: 0,
    });

    expect(mapProjectDataToDb(parsed)).toMatchObject({
      revenue_min: 0,
      revenue_max: 0,
      ebitda_min: 0,
      ebitda_max: 0,
      ebitda_margin: 0,
    });
  });
});
