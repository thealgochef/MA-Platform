import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../../../");
const SRC = path.join(ROOT, "src");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");

describe("Point #3 security hardening", () => {
  it("hardening migration protects auth-driving user columns", () => {
    const content = fs.readFileSync(
      path.join(MIGRATIONS, "00011_harden_profile_update_security.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    expect(content).toContain("prevent_sensitive_user_self_update");
    expect(content).not.toContain("OLD.id = auth.uid() AND");
    expect(content).toContain("NEW.role IS DISTINCT FROM OLD.role");
    expect(content).toContain("NEW.status IS DISTINCT FROM OLD.status");
    expect(content).toContain("NEW.firm_id IS DISTINCT FROM OLD.firm_id");
    expect(content).toContain("NEW.id IS DISTINCT FROM OLD.id");
    expect(combined).toContain("NEW.id IS DISTINCT FROM OLD.id");
    expect(combined).not.toContain("OLD.id = auth.uid() AND");
  });

  it("invitation route stores invitations without placeholder users", () => {
    const content = fs.readFileSync(
      path.join(SRC, "app", "api", "admin", "invitations", "route.ts"),
      "utf-8"
    );

    expect(content).toContain('from("firm_invitations")');
    expect(content).toContain("createAdminClient");
    expect(content).toContain('requireRole("admin")');
    expect(content).not.toContain('from("users")');
    expect(content).not.toContain("id: crypto.randomUUID()");
    expect(content).toContain("/login?invitation=");
  });

  it("login OAuth redirect preserves invitation token", () => {
    const content = fs.readFileSync(
      path.join(SRC, "app", "(public)", "login", "page.tsx"),
      "utf-8"
    );

    expect(content).toContain('searchParams.get("invitation")');
    expect(content).toContain('new URL("/api/auth/callback", window.location.origin)');
    expect(content).toContain('callbackUrl.searchParams.set("invitation", invitation)');
    expect(content).toContain("redirectTo: callbackUrl.toString()");
  });

  it("auth callback uses admin client and email validation for invitations", () => {
    const content = fs.readFileSync(
      path.join(SRC, "app", "api", "auth", "callback", "route.ts"),
      "utf-8"
    );

    expect(content).toContain("createAdminClient");
    expect(content).toMatch(/const\s+adminClient\s*=\s*createAdminClient\(\)/);
    expect(content).toContain('from("firm_invitations")');
    expect(content).toContain('"accept_firm_invitation"');
    expect(content).toContain("invitationEmailMatchesAuthenticatedUser");
    expect(content).toMatch(/invitation\?\.email\?\.trim\(\)\.toLowerCase\(\)/);
    expect(content).toMatch(/user\.email\?\.trim\(\)\.toLowerCase\(\)/);
    expect(content).toMatch(/invitationEmail\s*===\s*authenticatedEmail/);
  });

  it("invitation migration uses token-safe table and atomic service-role RPC", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00012_firm_invitations.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    for (const content of [migration, combined]) {
      expect(content).toContain("CREATE TABLE firm_invitations");
      expect(content).toContain("invitation_token text NOT NULL UNIQUE");
      expect(content).toContain("ALTER TABLE firm_invitations ENABLE ROW LEVEL SECURITY");
      expect(content).toContain("CREATE OR REPLACE FUNCTION accept_firm_invitation");
      expect(content).toContain("SECURITY DEFINER SET search_path = public");
      expect(content).toContain("FOR UPDATE");
      expect(content).toContain("ON CONFLICT (id) DO UPDATE");
      expect(content).toContain("consumed_at = now()");
      expect(content).toContain("REVOKE ALL ON firm_invitations FROM PUBLIC, anon, authenticated");
      expect(content).not.toMatch(/CREATE POLICY[\s\S]{0,200}ON firm_invitations[\s\S]{0,200}authenticated/);
    }
  });

  it("users self-update policy keeps updated rows scoped to auth uid", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00011_harden_profile_update_security.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");
    const selfUpdateWithCheck =
      /CREATE POLICY "Users can update their own profile"[\s\S]*?ON users FOR UPDATE[\s\S]*?USING \(id = auth\.uid\(\)\)[\s\S]*?WITH CHECK \(id = auth\.uid\(\)\)/;

    expect(migration).toMatch(selfUpdateWithCheck);
    expect(combined).toMatch(selfUpdateWithCheck);
  });

  it("project detail route requires approved buyer role", () => {
    const content = fs.readFileSync(
      path.join(SRC, "app", "api", "projects", "[id]", "route.ts"),
      "utf-8"
    );

    expect(content).toContain("requireRole");
    expect(content).toContain('requireRole("buyer")');
    expect(content).not.toContain("requireUser");
  });

  it("settings profile route requires approved users", () => {
    const content = fs.readFileSync(
      path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
      "utf-8"
    );

    expect(content).toContain("requireApprovedUser");
    expect(content).not.toContain("requireUser");
  });

  it("delete-account route requires approved user before service-role cleanup", () => {
    const content = fs.readFileSync(
      path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
      "utf-8"
    );

    expect(content).toContain("requireApprovedUser");
    expect(content).toContain("isAuthResponse");
    expect(content.indexOf("requireApprovedUser")).toBeLessThan(
      content.indexOf("supabaseAdmin.createAdminClient")
    );
  });

  it("admin API service-role routes require approved admin guard", () => {
    const routes = [
      path.join(SRC, "app", "api", "admin", "applications", "route.ts"),
      path.join(SRC, "app", "api", "admin", "invitations", "route.ts"),
      path.join(SRC, "app", "api", "admin", "users", "route.ts"),
    ];

    for (const route of routes) {
      const content = fs.readFileSync(route, "utf-8");

      expect(content).toContain("requireRole");
      expect(content).toContain('requireRole("admin")');
      expect(content).toContain("isAuthResponse");
      expect(content).not.toMatch(/select\("role"\)[\s\S]*profile\.role !== "admin"/);
    }
  });

  it("buyer_projects and firms RLS policies require approved status checks", () => {
    const content = fs.readFileSync(
      path.join(MIGRATIONS, "00011_harden_profile_update_security.sql"),
      "utf-8"
    );

    expect(content).toMatch(/buyer_projects[\s\S]*current_user_is_approved\('buyer'\)/);
    expect(content).toMatch(/firms[\s\S]*current_user_is_approved\(\)/);
    expect(content).toMatch(
      /CREATE POLICY "Admins can do everything on firms"[\s\S]*USING \(current_user_is_approved\('admin'\)\)[\s\S]*WITH CHECK \(current_user_is_approved\('admin'\)\)/
    );
    expect(content).not.toMatch(
      /CREATE POLICY "Admins can do everything on firms"\s+ON firms FOR ALL\s+USING \(is_admin\(\)\)/
    );
    expect(content).toContain("status = 'approved'");
  });

  it("security-definer approval helpers pin search_path", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00011_harden_profile_update_security.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    const helperWithPinnedPath =
      /CREATE OR REPLACE FUNCTION current_user_is_approved\([\s\S]*?\$\$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;/;

    expect(migration).toMatch(helperWithPinnedPath);
    expect(combined).toMatch(helperWithPinnedPath);
  });

  it("migration and combined SQL redefine is_admin with approved status", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00011_harden_profile_update_security.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    const approvedAdminHelper =
      /CREATE OR REPLACE FUNCTION is_admin\(\)[\s\S]*role = 'admin'[\s\S]*status = 'approved'[\s\S]*SECURITY DEFINER STABLE SET search_path = public;/;

    expect(migration).toMatch(approvedAdminHelper);
    expect(combined).toMatch(approvedAdminHelper);
  });

  it("combined firm admin policy requires approved admin status", () => {
    const content = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    expect(content).toMatch(
      /CREATE POLICY "Admins can do everything on firms"[\s\S]*USING \(current_user_is_approved\('admin'\)\)[\s\S]*WITH CHECK \(current_user_is_approved\('admin'\)\)/
    );
    expect(content).not.toMatch(
      /CREATE POLICY "Admins can do everything on firms"\s+ON firms FOR ALL\s+USING \(is_admin\(\)\)/
    );
  });

  it("deal document storage policies do not broadly expose protected paths to buyers", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00020_harden_deal_and_dispute_document_storage.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    for (const content of [migration, combined]) {
      expect(content).toContain("Authorized users can read deal documents by access state");
      expect(content).toContain("name = d.teaser_document_path");
      expect(content).toContain("name = d.nda_document_path AND e.nda_status IN ('sent', 'signed')");
      expect(content).toMatch(/name = d\.cim_document_path[\s\S]*e\.cim_released = true/);
      expect(content).toContain("JOIN deal_documents dd ON dd.file_path = name");
      expect(content).toContain("Broker firm members can upload deal documents for owned deals");
      expect(content).not.toMatch(/CREATE POLICY "Buyers with access can read deal documents"/);
      expect(content).not.toContain("role = 'buyer' AND status = 'approved')); ");
    }
  });

  it("dispute document storage policies are scoped to closure participants and admins", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00020_harden_deal_and_dispute_document_storage.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    for (const content of [migration, combined]) {
      expect(content).toContain("Authorized participants can upload dispute documents");
      expect(content).toContain("Authorized participants can read dispute documents");
      expect(content).toContain("JOIN deal_closures dc ON dc.deal_id::text = (storage.foldername(name))[1]");
      expect(content).toContain("dc.buyer_user_id = u.id");
      expect(content).not.toMatch(/CREATE POLICY "Authenticated users can upload dispute documents"/);
      expect(content).not.toMatch(/CREATE POLICY "Authenticated users can read dispute documents"/);
    }
  });

  it("signed NDA orphan cleanup uses service-role storage or a narrow DELETE policy", () => {
    const route = fs.readFileSync(
      path.join(SRC, "app", "api", "deals", "[id]", "nda", "route.ts"),
      "utf-8"
    );
    const migrations = fs.readdirSync(MIGRATIONS)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => fs.readFileSync(path.join(MIGRATIONS, file), "utf-8"))
      .join("\n");
    const hasServiceRoleCleanup = route.includes("createAdminClient") && route.includes("adminClient.storage") && route.includes("remove([ndaPath])");
    const hasSignedNdaDeletePolicy = /CREATE POLICY[\s\S]*signed-ndas[\s\S]*FOR DELETE/.test(migrations);

    expect(hasServiceRoleCleanup || hasSignedNdaDeletePolicy).toBe(true);
  });

  it("buyer document storage policies are owner-scoped and reviewer-scoped", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00021_harden_buyer_and_message_storage_policies.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    for (const content of [migration, combined]) {
      expect(content).toContain("Buyers can upload own scoped buyer documents");
      expect(content).toContain("Authorized users can read scoped buyer documents");
      expect(content).toContain("auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}");
      expect(content).toContain("(storage.foldername(name))[1] = auth.uid()::text");
      expect(content).toContain("JOIN buyer_documents bd");
      expect(content).toContain("JOIN deal_engagements e");
      expect(content).toContain("d.firm_id = u.firm_id");
      expect(content).toContain("u.role = 'admin'");
      expect(content).not.toMatch(/CREATE POLICY "Buyers can read their own documents"[\s\S]*auth\.uid\(\) IS NOT NULL\)/);
    }
  });

  it("message attachment storage policies are scoped to thread participants", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00021_harden_buyer_and_message_storage_policies.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    for (const content of [migration, combined]) {
      expect(content).toContain("Thread participants can upload message attachments");
      expect(content).toContain("Thread participants can read message attachments");
      expect(content).toContain("e.id::text = (storage.foldername(name))[1]");
      expect(content).toContain("e.buyer_user_id = auth.uid()");
      expect(content).toContain("d.point_of_contact_id = auth.uid()");
      expect(content).toContain("u.role = 'admin'");
      expect(content).toContain("/[0-9a-f]{8}-[0-9a-f]{4}");
      expect(content).not.toMatch(/CREATE POLICY "Authenticated users can read message attachments"[\s\S]*auth\.uid\(\) IS NOT NULL\)/);
    }
  });

  it("buyer CIM and post-NDA deal document access is revoked for inactive deal statuses", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00022_revoke_buyer_post_nda_document_access_by_deal_status.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    for (const content of [migration, combined]) {
      expect(content).toContain("Authorized users can read deal documents by access state");
      expect(content).toContain("Buyers with appropriate access can view deal documents");
      expect(content).toContain("name = d.cim_document_path");
      expect(content).toContain("e.cim_released = true");
      expect(content).toContain("dd.access_level = 'post_nda'");
      expect(content).toContain("deal_documents.access_level = 'post_nda'");
      expect(content).toContain("d.status NOT IN ('paused', 'terminated', 'closed')");
      expect(content).toContain("JOIN deals d ON d.id = dd.deal_id");
      expect(content).toContain("JOIN deals d ON d.id = de.deal_id");
      expect(content).toContain("u.role = 'admin'");
      expect(content).toContain("u.role = 'broker'");
    }
  });

  it("deal close status route uses atomic service-role RPC", () => {
    const route = fs.readFileSync(
      path.join(SRC, "app", "api", "deals", "[id]", "status", "route.ts"),
      "utf-8"
    );

    expect(route).toContain("createAdminClient");
    expect(route).toContain('adminClient.rpc("close_deal_with_winning_engagement"');
    expect(route).toContain("p_deal_id: params.id");
    expect(route).toContain("p_engagement_id: winningEngagementId");
    expect(route).toMatch(/if \(newStatus !== "closed"\)[\s\S]*?from\("deals"\)[\s\S]*?update\(updateData\)/);
    expect(route).not.toMatch(
      /newStatus === "closed"[\s\S]*?from\("deal_engagements"\)[\s\S]*?update\(\{\s*stage:\s*"closed"\s*\}\)[\s\S]*?from\("deals"\)/
    );
  });

  it("deal close RPC is present, pinned, atomic, and service-role only", () => {
    const migration = fs.readFileSync(
      path.join(MIGRATIONS, "00023_atomic_close_deal_with_winning_engagement.sql"),
      "utf-8"
    );
    const combined = fs.readFileSync(path.join(MIGRATIONS, "combined.sql"), "utf-8");

    for (const content of [migration, combined]) {
      expect(content).toContain("CREATE OR REPLACE FUNCTION close_deal_with_winning_engagement");
      expect(content).toMatch(
        /CREATE OR REPLACE FUNCTION close_deal_with_winning_engagement[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public/
      );
      expect(content).toContain("FOR UPDATE");
      expect(content).toContain("UPDATE deal_engagements");
      expect(content).toContain("stage IN ('loi_submitted', 'diligence', 'closed')");
      expect(content).toContain("UPDATE deals");
      expect(content).toContain("SET status = 'closed'");
      expect(content).toContain("closed_at = now()");
      expect(content).toContain(
        "REVOKE ALL ON FUNCTION close_deal_with_winning_engagement(uuid, uuid) FROM PUBLIC, anon, authenticated"
      );
      expect(content).toContain(
        "GRANT EXECUTE ON FUNCTION close_deal_with_winning_engagement(uuid, uuid) TO service_role"
      );
    }
  });

  it("buyer signup validates uploaded document metadata before service-role insert", () => {
    const content = fs.readFileSync(
      path.join(SRC, "app", "api", "signup", "buyer", "route.ts"),
      "utf-8"
    );

    expect(content).toContain("isValidBuyerDocumentPath");
    expect(content).toContain("isValidStorageObjectKey");
    expect(content).toContain("allowedPrefixes: [userId]");
    expect(content).toContain("filePath.startsWith(`${userId}/`)");
    expect(content).toContain("STORAGE_UUID_PDF_PATTERN");
    expect(content).toContain("FILE_CONSTRAINTS.MAX_SIZE_BYTES");
    expect(content).toContain("SAFE_PDF_FILE_NAME_PATTERN");
    expect(content).toContain("Invalid buyer document path");
    expect(content.indexOf("Invalid buyer document path")).toBeLessThan(content.indexOf("adminClient"));
  });
});
