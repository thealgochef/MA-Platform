import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  BROKER_NOTIFICATION_EVENTS,
  BUYER_NOTIFICATION_EVENTS,
} from "@/lib/constants";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 9: Settings & Account Management", () => {
  describe("Notification Event Constants", () => {
    it("exports broker and buyer notification event constants", () => {
      expect(Array.isArray(BROKER_NOTIFICATION_EVENTS)).toBe(true);
      expect(Array.isArray(BUYER_NOTIFICATION_EVENTS)).toBe(true);
      expect(BROKER_NOTIFICATION_EVENTS.length).toBeGreaterThan(0);
      expect(BUYER_NOTIFICATION_EVENTS.length).toBeGreaterThan(0);
    });
  });

  describe("Settings API Routes", () => {
    it("has profile route file and exports GET/PATCH handlers", async () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "settings", "profile", "route.ts"))
      ).toBe(true);

      const routeModule = await import("@/app/api/settings/profile/route");
      expect(routeModule.GET).toBeTypeOf("function");
      expect(routeModule.PATCH).toBeTypeOf("function");
    });

    it("has notifications route file and exports GET/PATCH handlers", async () => {
      expect(
        fs.existsSync(
          path.join(SRC, "app", "api", "settings", "notifications", "route.ts")
        )
      ).toBe(true);

      const routeModule = await import("@/app/api/settings/notifications/route");
      expect(routeModule.GET).toBeTypeOf("function");
      expect(routeModule.PATCH).toBeTypeOf("function");
    });

    it("has delete-account route file and exports POST handler", async () => {
      expect(
        fs.existsSync(
          path.join(SRC, "app", "api", "settings", "delete-account", "route.ts")
        )
      ).toBe(true);

      const routeModule = await import("@/app/api/settings/delete-account/route");
      expect(routeModule.POST).toBeTypeOf("function");
    });
  });

  describe("Settings page source checks", () => {
    it("resolves avatar URL from nested and top-level response keys", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("profile.avatar_url ?? profile.avatarUrl ?? payload.avatar_url ?? payload.avatarUrl ?? null");
    });

    it("uses next/image for avatar rendering instead of raw img tags", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain('import Image from "next/image"');
      expect(content).toContain("<Image");
      expect(content).not.toContain("<img");
    });

    it("includes firm location state wiring in the settings form", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("const [firmLocation, setFirmLocation] = useState(\"\")");
      expect(content).toContain("value={firmLocation}");
      expect(content).toContain("setFirmLocation");
    });

    it("uses first/last name UI and keeps accreditation wiring", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain('label="First Name"');
      expect(content).toContain('label="Last Name"');
      expect(content).toContain("const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();");
      expect(content).toContain('label="Basis for Accreditation"');
    });

    it("does not render or wire the Other Firm Members Who Need Access field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).not.toContain('label="Other Firm Members Who Need Access"');
      expect(content).not.toContain("otherMembers");
      expect(content).not.toContain("setOtherMembers");
    });

    it("locks buyer Type and Basis for Accreditation selects", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toMatch(/<SelectInput[\s\S]*label="Type"[\s\S]*value=\{buyerType\}[\s\S]*disabled/);
      expect(content).toMatch(
        /<SelectInput[\s\S]*label="Basis for Accreditation"[\s\S]*value=\{accreditation\}[\s\S]*disabled/
      );
    });

    it("aligns handleProfileSave payload with all visible settings UI fields", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      const handleProfileSaveMatch = content.match(
        /const handleProfileSave = async \(\) => \{[\s\S]*?\n  \};/
      );

      expect(handleProfileSaveMatch).not.toBeNull();

      const handleProfileSaveSource = handleProfileSaveMatch?.[0] || "";

      const alwaysSubmittedFields = [
        "fullName",
        "title",
        "phone",
        "linkedIn",
        "location",
        "industryFocus",
        "firmName",
        "description",
        "website",
        "firmLocation",
      ];

      alwaysSubmittedFields.forEach((field) => {
        expect(handleProfileSaveSource).toMatch(new RegExp(`\\b${field}\\b\\s*(?:,|:)`));
      });

      expect(handleProfileSaveSource).not.toContain("otherMembers");
      expect(handleProfileSaveSource).toMatch(/if\s*\(isBuyer\)\s*\{[\s\S]*payload\.aum\s*=\s*aum;[\s\S]*\}/);
      expect(handleProfileSaveSource).toMatch(
        /if\s*\(isBroker\)\s*\{[\s\S]*payload\.licenseCredentials\s*=\s*credentials;[\s\S]*payload\.dealTypes\s*=\s*dealTypes;[\s\S]*\}/
      );
      expect(handleProfileSaveSource).not.toMatch(/\bbuyerType\b\s*:/);
      expect(handleProfileSaveSource).not.toMatch(/\baccreditation\b\s*:/);
      expect(handleProfileSaveSource).not.toContain("payload.buyerType");
      expect(handleProfileSaveSource).not.toContain("payload.accreditation");
    });

    it("always allows buyer AUM updates without buyerType gating", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("if (isBuyer) {");
      expect(content).toContain("payload.aum = aum;");
      expect(content).not.toContain("BUYER_TYPE_VALUES.includes");
    });

    it("appends avatar cache-bust param safely when URL already has query params", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain('const appendCacheBustParam = (url: string) => `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`');
      expect(content).toContain("setAvatarUrl(newUrl ? appendCacheBustParam(newUrl) : null);");
    });

    it("handles delete-account failures with try/catch/finally and user message", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain("const [deleteMessage, setDeleteMessage] = useState(\"\")");
      expect(content).toContain("try {");
      expect(content).toContain("} catch {");
      expect(content).toContain("} finally {");
      expect(content).toContain("setDeleteMessage(await getErrorMessage(res, \"Failed to delete account.\"));");
      expect(content).toContain("<StatusMessage>{deleteMessage}</StatusMessage>");
    });
  });
});
