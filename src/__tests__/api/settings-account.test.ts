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
});
