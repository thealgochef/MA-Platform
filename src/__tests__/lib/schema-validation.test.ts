import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  ACCREDITATIONS,
  BUYER_TYPE_VALUES,
  FILE_CONSTRAINTS,
  INDUSTRIES,
  SIGNED_NDA_ARTIFACT_CONSTRAINTS,
} from "@/lib/constants";
import {
  adminInvitationCreateSchema,
  brokerSignupSchema,
  browseQuerySchema,
  buyerSignupSchema,
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

    it("should gate match_deals_to_project on buyer_projects.is_active in both incremental and combined SQL", () => {
      const incremental = fs.readFileSync(
        path.join(MIGRATIONS_DIR, "00007_storage_and_functions.sql"),
        "utf-8"
      );
      const combined = fs.readFileSync(path.join(MIGRATIONS_DIR, "combined.sql"), "utf-8");

      for (const sql of [incremental, combined]) {
        expect(sql).toContain("v_is_active boolean");
        expect(sql).toMatch(/bp\.is_active/);
        expect(sql).toMatch(/IF\s+v_is_active\s+IS\s+DISTINCT\s+FROM\s+true\s+THEN[\s\S]*RETURN;/);
      }
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
      expect(checkConstraintValues).toContain("individual_investor");
      expect(checkConstraintValues).not.toContain("private_investor");
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
      expect(checkConstraintValues).not.toContain("private_investor");
    });

    it("should not allow legacy private_investor in migration CHECK definitions", () => {
      const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql"));
      const checkDefinitions = files.flatMap((file) =>
        extractCheckDefinitions(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8"))
          .map((definition) => ({ file, definition }))
      );

      expect(
        checkDefinitions.filter(({ definition }) => definition.includes("private_investor"))
      ).toEqual([]);
    });
  });
});

describe("Settings profile validation", () => {
  it("rejects invalid buyerType values before database writes", () => {
    expect(settingsProfileUpdateSchema.safeParse({ buyerType: "private_investor" }).success)
      .toBe(false);
    expect(settingsProfileUpdateSchema.safeParse({ buyerType: "not_a_real_type" }).success)
      .toBe(false);
  });

  it("allows canonical buyerType values and empty values while preserving other keys", () => {
    expect(settingsProfileUpdateSchema.parse({ buyerType: "individual_investor" }).buyerType)
      .toBe("individual_investor");
    expect(settingsProfileUpdateSchema.parse({ buyerType: "" }).buyerType).toBe("");
    expect(settingsProfileUpdateSchema.parse({ buyerType: null }).buyerType).toBeNull();
    expect(settingsProfileUpdateSchema.parse({ fullName: "Ada Lovelace" }).fullName)
      .toBe("Ada Lovelace");
  });

  it("allows canonical accreditation values and empty values", () => {
    const canonicalAccreditationValues = ACCREDITATIONS.map(({ value }) => value);

    for (const accreditationValue of canonicalAccreditationValues) {
      expect(
        settingsProfileUpdateSchema.parse({ accreditation: accreditationValue }).accreditation
      ).toBe(accreditationValue);
    }

    expect(settingsProfileUpdateSchema.parse({ accreditation: "" }).accreditation).toBe("");
    expect(settingsProfileUpdateSchema.parse({ accreditation: null }).accreditation).toBeNull();
  });

  it("rejects invalid accreditation values", () => {
    expect(settingsProfileUpdateSchema.safeParse({ accreditation: "accredited" }).success)
      .toBe(false);
    expect(settingsProfileUpdateSchema.safeParse({ accreditation: "not_a_real_value" }).success)
      .toBe(false);
  });

  it("accepts the expected settings profile and firm update fields", () => {
    const parsed = settingsProfileUpdateSchema.parse({
      fullName: "Ada Lovelace",
      title: "Partner",
      avatarPath: "avatars/ada.png",
      phone: "555-1234",
      linkedIn: "https://www.linkedin.com/in/ada",
      location: "Austin, TX",
      industryFocus: ["Technology", "Healthcare"],
      licenseCredentials: "Series 7",
      dealTypes: "Control",
      buyerType: "family_office",
      aum: "$1B",
      firmName: "Analytical Capital",
      description: "Thesis-driven lower middle market investor",
      website: "https://analytical.example",
      firmLocation: "New York, NY",
      otherMembers: "Ari, Ben",
      firmIndustryFocus: ["Technology"],
    });

    expect(parsed).toMatchObject({
      fullName: "Ada Lovelace",
      title: "Partner",
      avatarPath: "avatars/ada.png",
      phone: "555-1234",
      linkedIn: "https://www.linkedin.com/in/ada",
      location: "Austin, TX",
      industryFocus: ["Technology", "Healthcare"],
      licenseCredentials: "Series 7",
      dealTypes: "Control",
      buyerType: "family_office",
      aum: "$1B",
      firmName: "Analytical Capital",
      description: "Thesis-driven lower middle market investor",
      website: "https://analytical.example",
      firmLocation: "New York, NY",
      otherMembers: "Ari, Ben",
      firmIndustryFocus: ["Technology"],
    });
  });

  it("validates avatarPath as a safe storage key", () => {
    expect(settingsProfileUpdateSchema.safeParse({ avatarPath: "user-1/avatar" }).success)
      .toBe(true);
    expect(settingsProfileUpdateSchema.safeParse({ avatarPath: "/user-1/avatar" }).success)
      .toBe(false);
    expect(settingsProfileUpdateSchema.safeParse({ avatarPath: "user-1/../avatar" }).success)
      .toBe(false);
    expect(settingsProfileUpdateSchema.safeParse({ avatarPath: "user-1/avatar?dl=1" }).success)
      .toBe(false);
  });

  it("rejects unknown extra keys in settings profile payload", () => {
    expect(
      settingsProfileUpdateSchema.safeParse({
        fullName: "Ada Lovelace",
        avatarUrl: "https://cdn.example.com/avatar.png",
      }).success
    ).toBe(false);

    expect(
      settingsProfileUpdateSchema.safeParse({
        firmName: "Analytical Capital",
        unexpectedField: "not-allowed",
      }).success
    ).toBe(false);
  });
});

describe("Industry enum validation", () => {
  const validIndustry = INDUSTRIES[0];
  const anotherValidIndustry = INDUSTRIES[1];
  const invalidIndustry = "Completely Custom Industry";

  const validBrokerSignupInput = {
    firstName: "Ada",
    lastName: "Lovelace",
    title: "Managing Director",
    phoneNumber: "555-1111",
    firmName: "Analytical Capital",
    location: "Austin, TX",
    licenseCredentials: "Series 7",
    firmDescription: "Lower middle market advisor",
    dealTypes: "Control",
    industryFocus: [validIndustry],
    membershipAgreementSigned: true as const,
    signature: "Ada Lovelace",
  };

  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: [validIndustry],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  it("accepts industry values from INDUSTRIES for broker and buyer signup", () => {
    expect(
      brokerSignupSchema.safeParse({
        ...validBrokerSignupInput,
        industryFocus: [validIndustry, anotherValidIndustry],
      }).success
    ).toBe(true);

    expect(
      buyerSignupSchema.safeParse({
        ...validBuyerSignupInput,
        industryFocus: [validIndustry, anotherValidIndustry],
      }).success
    ).toBe(true);
  });

  it("accepts industry values from INDUSTRIES for settings profile fields", () => {
    const result = settingsProfileUpdateSchema.safeParse({
      industryFocus: [validIndustry, anotherValidIndustry],
      firmIndustryFocus: [validIndustry],
    });

    expect(result.success).toBe(true);
  });

  it("rejects free-text industry values for broker and buyer signup", () => {
    const brokerResult = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      industryFocus: [invalidIndustry],
    });
    const buyerResult = buyerSignupSchema.safeParse({
      ...validBuyerSignupInput,
      industryFocus: [invalidIndustry],
    });

    expect(brokerResult.success).toBe(false);
    expect(buyerResult.success).toBe(false);
  });

  it("rejects free-text industry values for settings profile fields", () => {
    expect(
      settingsProfileUpdateSchema.safeParse({ industryFocus: [invalidIndustry] }).success
    ).toBe(false);
    expect(
      settingsProfileUpdateSchema.safeParse({ firmIndustryFocus: [invalidIndustry] }).success
    ).toBe(false);
  });

  it("keeps signup industryFocus minimum-selection validation message for empty arrays", () => {
    const brokerResult = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      industryFocus: [],
    });
    const buyerResult = buyerSignupSchema.safeParse({
      ...validBuyerSignupInput,
      industryFocus: [],
    });

    expect(brokerResult.success).toBe(false);
    expect(buyerResult.success).toBe(false);
    expect(brokerResult.error?.flatten().fieldErrors.industryFocus).toContain(
      "Select at least one industry"
    );
    expect(buyerResult.error?.flatten().fieldErrors.industryFocus).toContain(
      "Select at least one industry"
    );
  });
});

describe("Signup strict payload and NFC normalization", () => {
  const validBrokerSignupInput = {
    firstName: "Ada",
    lastName: "Lovelace",
    title: "Managing Director",
    phoneNumber: "555-1111",
    firmName: "Analytical Capital",
    location: "Austin, TX",
    licenseCredentials: "Series 7",
    firmDescription: "Lower middle market advisor",
    dealTypes: "Control",
    industryFocus: ["Technology"],
    membershipAgreementSigned: true as const,
    signature: "Ada Lovelace",
  };

  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: ["Technology"],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  it("rejects unknown keys in broker signup payloads", () => {
    const result = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      unexpectedField: "not-allowed",
    });

    expect(result.success).toBe(false);

    const unrecognizedKeysIssue = !result.success
      ? result.error.issues.find((issue) => issue.code === "unrecognized_keys")
      : undefined;

    expect(unrecognizedKeysIssue).toBeDefined();
    expect(
      unrecognizedKeysIssue && "keys" in unrecognizedKeysIssue
        ? unrecognizedKeysIssue.keys
        : []
    ).toContain("unexpectedField");
  });

  it("rejects unknown keys in buyer signup payloads", () => {
    const result = buyerSignupSchema.safeParse({
      ...validBuyerSignupInput,
      unexpectedField: "not-allowed",
    });

    expect(result.success).toBe(false);

    const unrecognizedKeysIssue = !result.success
      ? result.error.issues.find((issue) => issue.code === "unrecognized_keys")
      : undefined;

    expect(unrecognizedKeysIssue).toBeDefined();
    expect(
      unrecognizedKeysIssue && "keys" in unrecognizedKeysIssue
        ? unrecognizedKeysIssue.keys
        : []
    ).toContain("unexpectedField");
  });

  it("normalizes broker name-like fields from decomposed Unicode to NFC", () => {
    const parsed = brokerSignupSchema.parse({
      ...validBrokerSignupInput,
      firstName: "Jose\u0301",
      lastName: "Garci\u0301a",
      title: "Sen\u0303or Broker",
      firmName: "Cafe\u0301 Capital",
      signature: "Jose\u0301 Garci\u0301a",
    });

    expect(parsed.firstName).toBe("José");
    expect(parsed.lastName).toBe("García");
    expect(parsed.title).toBe("Señor Broker");
    expect(parsed.firmName).toBe("Café Capital");
    expect(parsed.signature).toBe("José García");
  });

  it("normalizes buyer name-like fields from decomposed Unicode to NFC", () => {
    const parsed = buyerSignupSchema.parse({
      ...validBuyerSignupInput,
      firstName: "Rene\u0301e",
      lastName: "Nin\u0303o",
      title: "Associ\u0065\u0301",
      firmName: "Cafe\u0301 Ventures",
      signature: "Rene\u0301e Nin\u0303o",
    });

    expect(parsed.firstName).toBe("Renée");
    expect(parsed.lastName).toBe("Niño");
    expect(parsed.title).toBe("Associé");
    expect(parsed.firmName).toBe("Café Ventures");
    expect(parsed.signature).toBe("Renée Niño");
  });
});

describe("Signup and settings URL normalization", () => {
  const validBrokerSignupInput = {
    firstName: "Ada",
    lastName: "Lovelace",
    title: "Managing Director",
    phoneNumber: "555-1111",
    firmName: "Analytical Capital",
    location: "Austin, TX",
    licenseCredentials: "Series 7",
    firmDescription: "Lower middle market advisor",
    dealTypes: "Control",
    industryFocus: ["Technology"],
    membershipAgreementSigned: true as const,
    signature: "Ada Lovelace",
  };

  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: ["Technology"],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  it("accepts broker LinkedIn and firm website URLs surrounded by whitespace", () => {
    const parsed = brokerSignupSchema.parse({
      ...validBrokerSignupInput,
      linkedIn: "  https://www.linkedin.com/in/ada  ",
      firmWebsite: "  https://analytical.example  ",
    });

    expect(parsed.linkedIn).toBe("https://www.linkedin.com/in/ada");
    expect(parsed.firmWebsite).toBe("https://analytical.example");
  });

  it("treats whitespace-only broker URL fields as optional empty values", () => {
    const parsed = brokerSignupSchema.parse({
      ...validBrokerSignupInput,
      linkedIn: "   ",
      firmWebsite: "\t\n  ",
    });

    expect(parsed.linkedIn).toBe("");
    expect(parsed.firmWebsite).toBe("");
  });

  it("matches broker URL normalization behavior for buyer LinkedIn and firm website", () => {
    const parsedTrimmed = buyerSignupSchema.parse({
      ...validBuyerSignupInput,
      linkedIn: "  https://www.linkedin.com/in/grace  ",
      firmWebsite: "  https://compiler.example  ",
    });
    const parsedWhitespaceOnly = buyerSignupSchema.parse({
      ...validBuyerSignupInput,
      linkedIn: "   ",
      firmWebsite: "\n\t ",
    });

    expect(parsedTrimmed.linkedIn).toBe("https://www.linkedin.com/in/grace");
    expect(parsedTrimmed.firmWebsite).toBe("https://compiler.example");
    expect(parsedWhitespaceOnly.linkedIn).toBe("");
    expect(parsedWhitespaceOnly.firmWebsite).toBe("");
  });

  it("rejects malformed broker URLs even after trimming surrounding whitespace", () => {
    // Arrange
    const malformedLinkedInInput = {
      ...validBrokerSignupInput,
      linkedIn: "  not-a-url  ",
    };
    const malformedFirmWebsiteInput = {
      ...validBrokerSignupInput,
      firmWebsite: "  not-a-url  ",
    };

    // Act
    const linkedInResult = brokerSignupSchema.safeParse(malformedLinkedInInput);
    const firmWebsiteResult = brokerSignupSchema.safeParse(malformedFirmWebsiteInput);

    // Assert
    expect(linkedInResult.success).toBe(false);
    expect(firmWebsiteResult.success).toBe(false);
  });

  it("rejects malformed buyer URLs even after trimming surrounding whitespace", () => {
    // Arrange
    const malformedLinkedInInput = {
      ...validBuyerSignupInput,
      linkedIn: "  not-a-url  ",
    };
    const malformedFirmWebsiteInput = {
      ...validBuyerSignupInput,
      firmWebsite: "  not-a-url  ",
    };

    // Act
    const linkedInResult = buyerSignupSchema.safeParse(malformedLinkedInInput);
    const firmWebsiteResult = buyerSignupSchema.safeParse(malformedFirmWebsiteInput);

    // Assert
    expect(linkedInResult.success).toBe(false);
    expect(firmWebsiteResult.success).toBe(false);
  });

  it("rejects malformed settings LinkedIn and website URLs after trimming", () => {
    // Arrange
    const malformedLinkedInInput = { linkedIn: "  not-a-url  " };
    const malformedWebsiteInput = { website: "  not-a-url  " };

    // Act
    const linkedInResult = settingsProfileUpdateSchema.safeParse(malformedLinkedInInput);
    const websiteResult = settingsProfileUpdateSchema.safeParse(malformedWebsiteInput);

    // Assert
    expect(linkedInResult.success).toBe(false);
    expect(websiteResult.success).toBe(false);
  });

  it("rejects null for optional broker signup URL fields", () => {
    // Arrange
    const nullLinkedInInput = {
      ...validBrokerSignupInput,
      linkedIn: null,
    };
    const nullFirmWebsiteInput = {
      ...validBrokerSignupInput,
      firmWebsite: null,
    };

    // Act
    const linkedInResult = brokerSignupSchema.safeParse(nullLinkedInInput);
    const firmWebsiteResult = brokerSignupSchema.safeParse(nullFirmWebsiteInput);

    // Assert
    expect(linkedInResult.success).toBe(false);
    expect(firmWebsiteResult.success).toBe(false);
  });

  it("rejects null for optional buyer signup URL fields", () => {
    // Arrange
    const nullLinkedInInput = {
      ...validBuyerSignupInput,
      linkedIn: null,
    };
    const nullFirmWebsiteInput = {
      ...validBuyerSignupInput,
      firmWebsite: null,
    };

    // Act
    const linkedInResult = buyerSignupSchema.safeParse(nullLinkedInInput);
    const firmWebsiteResult = buyerSignupSchema.safeParse(nullFirmWebsiteInput);

    // Assert
    expect(linkedInResult.success).toBe(false);
    expect(firmWebsiteResult.success).toBe(false);
  });

  it("normalizes settings LinkedIn and website URLs and converts whitespace-only values to empty", () => {
    const parsedTrimmed = settingsProfileUpdateSchema.parse({
      linkedIn: "  https://www.linkedin.com/in/settings-user  ",
      website: "  https://settings.example  ",
    });
    const parsedWhitespaceOnly = settingsProfileUpdateSchema.parse({
      linkedIn: "  ",
      website: "\t\n ",
    });

    expect(parsedTrimmed.linkedIn).toBe("https://www.linkedin.com/in/settings-user");
    expect(parsedTrimmed.website).toBe("https://settings.example");
    expect(parsedWhitespaceOnly.linkedIn).toBe("");
    expect(parsedWhitespaceOnly.website).toBe("");
  });

  it("continues to allow null settings LinkedIn and website values", () => {
    const parsed = settingsProfileUpdateSchema.parse({
      linkedIn: null,
      website: null,
    });

    expect(parsed.linkedIn).toBeNull();
    expect(parsed.website).toBeNull();
  });
});

describe("Signup and settings phone normalization and validation", () => {
  const validBrokerSignupInput = {
    firstName: "Ada",
    lastName: "Lovelace",
    title: "Managing Director",
    phoneNumber: "555-1111",
    firmName: "Analytical Capital",
    location: "Austin, TX",
    licenseCredentials: "Series 7",
    firmDescription: "Lower middle market advisor",
    dealTypes: "Control",
    industryFocus: ["Technology"],
    membershipAgreementSigned: true as const,
    signature: "Ada Lovelace",
  };

  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: ["Technology"],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  it("normalizes signup and settings phone values by trimming and collapsing internal spaces", () => {
    // Arrange
    const rawPhone = "  +1   (212)   555-7890   extension   1234  ";

    // Act
    const brokerParsed = brokerSignupSchema.parse({ ...validBrokerSignupInput, phoneNumber: rawPhone });
    const buyerParsed = buyerSignupSchema.parse({ ...validBuyerSignupInput, phoneNumber: rawPhone });
    const settingsParsed = settingsProfileUpdateSchema.parse({ phone: rawPhone });

    // Assert
    expect(brokerParsed.phoneNumber).toBe("+1 (212) 555-7890 extension 1234");
    expect(buyerParsed.phoneNumber).toBe("+1 (212) 555-7890 extension 1234");
    expect(settingsParsed.phone).toBe("+1 (212) 555-7890 extension 1234");
  });

  it("rejects whitespace-only signup phone numbers with the required message", () => {
    // Arrange
    const brokerInput = { ...validBrokerSignupInput, phoneNumber: "   \t\n  " };
    const buyerInput = { ...validBuyerSignupInput, phoneNumber: "   " };

    // Act
    const brokerResult = brokerSignupSchema.safeParse(brokerInput);
    const buyerResult = buyerSignupSchema.safeParse(buyerInput);

    // Assert
    expect(brokerResult.success).toBe(false);
    expect(buyerResult.success).toBe(false);
    expect(brokerResult.error?.flatten().fieldErrors.phoneNumber).toContain("Phone number is required");
    expect(buyerResult.error?.flatten().fieldErrors.phoneNumber).toContain("Phone number is required");
  });

  it("accepts common valid phone formats including x, ext, and extension suffixes", () => {
    // Arrange
    const validPhones = [
      "555-1234",
      "+1 (212) 555-7890",
      "212.555.7890",
      "2125557890 x123",
      "2125557890 ext 456",
      "2125557890 extension 789",
    ];

    // Act + Assert
    for (const phone of validPhones) {
      expect(brokerSignupSchema.safeParse({ ...validBrokerSignupInput, phoneNumber: phone }).success)
        .toBe(true);
      expect(buyerSignupSchema.safeParse({ ...validBuyerSignupInput, phoneNumber: phone }).success)
        .toBe(true);
      expect(settingsProfileUpdateSchema.safeParse({ phone }).success).toBe(true);
    }
  });

  it("rejects invalid phone formats with unsupported characters or malformed extensions", () => {
    // Arrange
    const invalidPhones = [
      "555-ABCD",
      "555-1234@55",
      "2125557890 ext",
      "2125557890 extension abc",
      "2125557890 x12x",
    ];

    // Act + Assert
    for (const phone of invalidPhones) {
      expect(brokerSignupSchema.safeParse({ ...validBrokerSignupInput, phoneNumber: phone }).success)
        .toBe(false);
      expect(buyerSignupSchema.safeParse({ ...validBuyerSignupInput, phoneNumber: phone }).success)
        .toBe(false);
      expect(settingsProfileUpdateSchema.safeParse({ phone }).success).toBe(false);
    }
  });

  it("enforces 7 to 15 main-number digits while excluding extension digits from the count", () => {
    // Arrange
    const tooShortMainNumber = "123456 x999";
    const tooLongMainNumber = "+1234567890123456 ext 1";
    const maxValidMainNumberWithExtension = "+123456789012345 extension 9999999999";

    // Act
    const tooShortResult = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      phoneNumber: tooShortMainNumber,
    });
    const tooLongResult = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      phoneNumber: tooLongMainNumber,
    });
    const buyerTooShortResult = buyerSignupSchema.safeParse({
      ...validBuyerSignupInput,
      phoneNumber: tooShortMainNumber,
    });
    const buyerTooLongResult = buyerSignupSchema.safeParse({
      ...validBuyerSignupInput,
      phoneNumber: tooLongMainNumber,
    });
    const validResult = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      phoneNumber: maxValidMainNumberWithExtension,
    });

    // Assert
    expect(tooShortResult.success).toBe(false);
    expect(tooLongResult.success).toBe(false);
    expect(buyerTooShortResult.success).toBe(false);
    expect(buyerTooLongResult.success).toBe(false);
    expect(validResult.success).toBe(true);
    expect(tooShortResult.error?.flatten().fieldErrors.phoneNumber).toContain(
      "Phone number must contain between 7 and 15 digits"
    );
    expect(tooLongResult.error?.flatten().fieldErrors.phoneNumber).toContain(
      "Phone number must contain between 7 and 15 digits"
    );
    expect(buyerTooShortResult.error?.flatten().fieldErrors.phoneNumber).toContain(
      "Phone number must contain between 7 and 15 digits"
    );
    expect(buyerTooLongResult.error?.flatten().fieldErrors.phoneNumber).toContain(
      "Phone number must contain between 7 and 15 digits"
    );
  });

  it("enforces the 50-character phone limit for required and optional phone fields", () => {
    // Arrange
    const extensionPrefix = "+1 (212) 555-7890 ext ";
    const maxLengthPhone = `${extensionPrefix}${"1".repeat(50 - extensionPrefix.length)}`;
    const overMaxLengthPhone = `${maxLengthPhone}1`;

    // Act
    const requiredAtMaxResult = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      phoneNumber: maxLengthPhone,
    });
    const requiredOverMaxResult = brokerSignupSchema.safeParse({
      ...validBrokerSignupInput,
      phoneNumber: overMaxLengthPhone,
    });
    const buyerOverMaxResult = buyerSignupSchema.safeParse({
      ...validBuyerSignupInput,
      phoneNumber: overMaxLengthPhone,
    });
    const optionalAtMaxResult = settingsProfileUpdateSchema.safeParse({ phone: maxLengthPhone });
    const optionalOverMaxResult = settingsProfileUpdateSchema.safeParse({ phone: overMaxLengthPhone });

    // Assert
    expect(maxLengthPhone).toHaveLength(50);
    expect(requiredAtMaxResult.success).toBe(true);
    expect(optionalAtMaxResult.success).toBe(true);
    expect(requiredOverMaxResult.success).toBe(false);
    expect(buyerOverMaxResult.success).toBe(false);
    expect(optionalOverMaxResult.success).toBe(false);
    expect(requiredOverMaxResult.error?.flatten().fieldErrors.phoneNumber).toContain(
      "Phone number must be 50 characters or less"
    );
    expect(buyerOverMaxResult.error?.flatten().fieldErrors.phoneNumber).toContain(
      "Phone number must be 50 characters or less"
    );
    expect(optionalOverMaxResult.error?.flatten().fieldErrors.phone).toContain(
      "Phone number must be 50 characters or less"
    );
  });

  it("treats whitespace-only optional settings phone as empty and accepts omitted or empty phone", () => {
    // Arrange
    const whitespaceOnlyInput = { phone: " \t\n " };
    const emptyStringInput = { phone: "" };
    const omittedPhoneInput = {};

    // Act
    const whitespaceParsed = settingsProfileUpdateSchema.parse(whitespaceOnlyInput);
    const emptyParsed = settingsProfileUpdateSchema.parse(emptyStringInput);
    const omittedParsed = settingsProfileUpdateSchema.parse(omittedPhoneInput);

    // Assert
    expect(whitespaceParsed.phone).toBe("");
    expect(emptyParsed.phone).toBe("");
    expect(omittedParsed.phone).toBeUndefined();
  });
});

describe("Buyer signup required text field trim/max parity", () => {
  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: ["Technology"],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  const constrainedFields = [
    {
      field: "firstName",
      max: 50,
      requiredMessage: "First name is required",
      maxMessage: "First name must be 50 characters or less",
    },
    {
      field: "lastName",
      max: 50,
      requiredMessage: "Last name is required",
      maxMessage: "Last name must be 50 characters or less",
    },
    {
      field: "title",
      max: 255,
      requiredMessage: "Title is required",
      maxMessage: "Title must be 255 characters or less",
    },
    {
      field: "firmName",
      max: 255,
      requiredMessage: "Firm name is required",
      maxMessage: "Firm name must be 255 characters or less",
    },
    {
      field: "location",
      max: 255,
      requiredMessage: "Location is required",
      maxMessage: "Location must be 255 characters or less",
    },
    {
      field: "firmDescription",
      max: 5000,
      requiredMessage: "Firm description is required",
      maxMessage: "Firm description must be 5000 characters or less",
    },
    {
      field: "signature",
      max: 120,
      requiredMessage: "Electronic signature is required",
      maxMessage: "Electronic signature must be 120 characters or less",
    },
  ] as const;

  it("rejects whitespace-only required buyer text fields after trim", () => {
    for (const { field, requiredMessage } of constrainedFields) {
      // Arrange
      const input = {
        ...validBuyerSignupInput,
        [field]: "   \t\n   ",
      };

      // Act
      const result = buyerSignupSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors[field]).toContain(requiredMessage);
    }
  });

  it("accepts required buyer text fields exactly at max length", () => {
    for (const { field, max } of constrainedFields) {
      // Arrange
      const input = {
        ...validBuyerSignupInput,
        [field]: "x".repeat(max),
      };

      // Act
      const result = buyerSignupSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    }
  });

  it("rejects required buyer text fields when length is max + 1", () => {
    for (const { field, max, maxMessage } of constrainedFields) {
      // Arrange
      const input = {
        ...validBuyerSignupInput,
        [field]: "x".repeat(max + 1),
      };

      // Act
      const result = buyerSignupSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors[field]).toContain(maxMessage);
    }
  });
});

describe("Buyer signup enum required and invalid-type messages", () => {
  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: ["Technology"],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  it("returns 'Buyer type is required' when firmType is missing", () => {
    // Arrange
    const { firmType: _firmType, ...inputWithoutFirmType } = validBuyerSignupInput;

    // Act
    const result = buyerSignupSchema.safeParse(inputWithoutFirmType);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.firmType).toContain("Buyer type is required");
  });

  it("returns 'Accreditation is required' when accreditation is missing", () => {
    // Arrange
    const { accreditation: _accreditation, ...inputWithoutAccreditation } = validBuyerSignupInput;

    // Act
    const result = buyerSignupSchema.safeParse(inputWithoutAccreditation);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.accreditation).toContain("Accreditation is required");
  });

  it("returns required messages when enum select fields are empty strings", () => {
    // Arrange
    const input = {
      ...validBuyerSignupInput,
      firmType: "",
      accreditation: "",
    };

    // Act
    const result = buyerSignupSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.firmType).toContain("Buyer type is required");
    expect(result.error?.flatten().fieldErrors.accreditation).toContain("Accreditation is required");
  });

  it("returns required messages when enum select fields are whitespace-only strings", () => {
    // Arrange
    const input = {
      ...validBuyerSignupInput,
      firmType: "   \t\n  ",
      accreditation: "   ",
    };

    // Act
    const result = buyerSignupSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.firmType).toContain("Buyer type is required");
    expect(result.error?.flatten().fieldErrors.accreditation).toContain("Accreditation is required");
  });

  it("returns 'Buyer type is required' for invalid firmType types", () => {
    // Arrange
    const invalidFirmTypes = [null, 123];

    for (const invalidFirmType of invalidFirmTypes) {
      const input = {
        ...validBuyerSignupInput,
        firmType: invalidFirmType,
      };

      // Act
      const result = buyerSignupSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.firmType).toContain("Buyer type is required");
    }
  });

  it("returns 'Accreditation is required' for invalid accreditation types", () => {
    // Arrange
    const invalidAccreditations = [null, 123];

    for (const invalidAccreditation of invalidAccreditations) {
      const input = {
        ...validBuyerSignupInput,
        accreditation: invalidAccreditation,
      };

      // Act
      const result = buyerSignupSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.accreditation).toContain("Accreditation is required");
    }
  });

  it("keeps enum validation errors for non-empty invalid enum strings", () => {
    // Arrange
    const input = {
      ...validBuyerSignupInput,
      firmType: "not_a_real_buyer_type",
      accreditation: "not_a_real_accreditation",
    };

    // Act
    const result = buyerSignupSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);

    const firmTypeErrors = result.error?.flatten().fieldErrors.firmType ?? [];
    const accreditationErrors = result.error?.flatten().fieldErrors.accreditation ?? [];

    expect(firmTypeErrors).not.toContain("Buyer type is required");
    expect(accreditationErrors).not.toContain("Accreditation is required");
    expect(firmTypeErrors.some((message) => message.toLowerCase().includes("invalid enum"))).toBe(
      true
    );
    expect(
      accreditationErrors.some((message) => message.toLowerCase().includes("invalid enum"))
    ).toBe(true);
  });
});

describe("Signup otherMembers normalization and max-length validation", () => {
  const OTHER_MEMBERS_MAX_MESSAGE = "Other members must be 5000 characters or less";

  const validBrokerSignupInput = {
    firstName: "Ada",
    lastName: "Lovelace",
    title: "Managing Director",
    phoneNumber: "555-1111",
    firmName: "Analytical Capital",
    location: "Austin, TX",
    licenseCredentials: "Series 7",
    firmDescription: "Lower middle market advisor",
    dealTypes: "Control",
    industryFocus: ["Technology"],
    membershipAgreementSigned: true as const,
    signature: "Ada Lovelace",
  };

  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: ["Technology"],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  const signupSchemas = [
    { label: "broker", schema: brokerSignupSchema, baseInput: validBrokerSignupInput },
    { label: "buyer", schema: buyerSignupSchema, baseInput: validBuyerSignupInput },
  ] as const;

  it("trims non-empty otherMembers values for broker and buyer signup", () => {
    for (const { schema, baseInput } of signupSchemas) {
      const parsed = schema.parse({
        ...baseInput,
        otherMembers: "  Alice, Bob  ",
      });

      expect(parsed.otherMembers).toBe("Alice, Bob");
    }
  });

  it("normalizes whitespace-only otherMembers values to undefined for broker and buyer signup", () => {
    for (const { schema, baseInput } of signupSchemas) {
      const parsed = schema.parse({
        ...baseInput,
        otherMembers: "  \t\n  ",
      });

      expect(parsed.otherMembers).toBeUndefined();
    }
  });

  it("accepts otherMembers values at the 5000-character boundary for broker and buyer signup", () => {
    const maxLengthValue = "x".repeat(5000);

    for (const { schema, baseInput } of signupSchemas) {
      const parsed = schema.parse({
        ...baseInput,
        otherMembers: maxLengthValue,
      });

      expect(parsed.otherMembers).toBe(maxLengthValue);
    }
  });

  it("rejects otherMembers values longer than 5000 characters for broker and buyer signup", () => {
    const overLimitValue = "x".repeat(5001);

    for (const { label, schema, baseInput } of signupSchemas) {
      const result = schema.safeParse({
        ...baseInput,
        otherMembers: overLimitValue,
      });

      expect(result.success, `${label} should reject over-limit otherMembers`).toBe(false);
      expect(result.error?.flatten().fieldErrors.otherMembers).toContain(OTHER_MEMBERS_MAX_MESSAGE);
    }
  });
});

describe("Buyer and settings AUM trim and max-length validation", () => {
  const BUYER_AUM_REQUIRED_MESSAGE = "Assets under management is required";
  const AUM_MAX_MESSAGE = "Assets under management must be 20 characters or less";

  const validBuyerSignupInput = {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Partner",
    phoneNumber: "555-2222",
    firmName: "Compiler Ventures",
    location: "New York, NY",
    firmType: "family_office" as const,
    firmDescription: "Long-term investor",
    accreditation: "none" as const,
    industryFocus: ["Technology"],
    aum: "$1B",
    membershipAgreementSigned: true as const,
    signature: "Grace Hopper",
    documentPaths: [],
  };

  it("trims buyer AUM when a valid value includes surrounding whitespace", () => {
    // Arrange
    const input = {
      ...validBuyerSignupInput,
      aum: "   $500M   ",
    };

    // Act
    const parsed = buyerSignupSchema.parse(input);

    // Assert
    expect(parsed.aum).toBe("$500M");
  });

  it("rejects buyer AUM when value is whitespace-only after trimming", () => {
    // Arrange
    const input = {
      ...validBuyerSignupInput,
      aum: "   \t\n   ",
    };

    // Act
    const result = buyerSignupSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.aum).toContain(BUYER_AUM_REQUIRED_MESSAGE);
  });

  it("rejects buyer AUM longer than 20 characters with the max-length message", () => {
    // Arrange
    const input = {
      ...validBuyerSignupInput,
      aum: "x".repeat(21),
    };

    // Act
    const result = buyerSignupSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.aum).toContain(AUM_MAX_MESSAGE);
  });

  it("accepts buyer AUM exactly at the 20-character boundary", () => {
    // Arrange
    const input = {
      ...validBuyerSignupInput,
      aum: "x".repeat(20),
    };

    // Act
    const result = buyerSignupSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("trims settings AUM when a valid value includes surrounding whitespace", () => {
    // Arrange
    const input = { aum: "   $250M   " };

    // Act
    const parsed = settingsProfileUpdateSchema.parse(input);

    // Assert
    expect(parsed.aum).toBe("$250M");
  });

  it("accepts settings AUM as an empty string and when omitted", () => {
    // Arrange
    const emptyStringInput = { aum: "" };
    const omittedInput = {};

    // Act
    const emptyStringParsed = settingsProfileUpdateSchema.parse(emptyStringInput);
    const omittedParsed = settingsProfileUpdateSchema.parse(omittedInput);

    // Assert
    expect(emptyStringParsed.aum).toBe("");
    expect(omittedParsed.aum).toBeUndefined();
  });

  it("rejects settings AUM longer than 20 characters with the max-length message", () => {
    // Arrange
    const input = { aum: "x".repeat(21) };

    // Act
    const result = settingsProfileUpdateSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.aum).toContain(AUM_MAX_MESSAGE);
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

  it("validates NDA actions and rejects unknown keys for strict sign/decline payloads", () => {
    // Arrange
    const validDeclinePayload = { action: "decline" };
    const validSignPayload = {
      action: "sign",
      signatureName: "Ada Lovelace",
      signatureTitle: "Partner",
      signatureCompany: "Example Capital",
    };
    const signPayloadWithUnexpectedSignatureDate = {
      ...validSignPayload,
      signatureDate: "2026-01-01",
    };
    const declinePayloadWithUnexpectedKey = {
      ...validDeclinePayload,
      reason: "Not interested",
    };

    // Act
    const validDeclineResult = ndaActionSchema.safeParse(validDeclinePayload);
    const validSignResult = ndaActionSchema.safeParse(validSignPayload);
    const invalidMissingSignFieldsResult = ndaActionSchema.safeParse({ action: "sign", signatureName: "Ada" });
    const invalidSignNameLengthResult = ndaActionSchema.safeParse({
      action: "sign",
      signatureName: "A".repeat(121),
      signatureTitle: "Partner",
      signatureCompany: "Example Capital",
    });
    const invalidSignUnexpectedKeyResult = ndaActionSchema.safeParse(signPayloadWithUnexpectedSignatureDate);
    const invalidDeclineUnexpectedKeyResult = ndaActionSchema.safeParse(declinePayloadWithUnexpectedKey);

    // Assert
    expect(validDeclineResult.success).toBe(true);
    expect(validSignResult.success).toBe(true);
    expect(invalidMissingSignFieldsResult.success).toBe(false);
    expect(invalidSignNameLengthResult.success).toBe(false);
    expect(invalidSignUnexpectedKeyResult.success).toBe(false);
    expect(invalidDeclineUnexpectedKeyResult.success).toBe(false);
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
