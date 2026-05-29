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

    it("includes a firm location field in the settings form", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );

      expect(content).toContain('label="Firm Location"');
      expect(content).toContain("setFirmLocation");
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
