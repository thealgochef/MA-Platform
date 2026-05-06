import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("Phase 9: Settings & Account Management", () => {
  // ─── Constants: Notification Event Types ─────────────────────────
  describe("Notification Event Constants", () => {
    it("should export BROKER_NOTIFICATION_EVENTS from constants", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "constants.ts"), "utf-8");
      expect(content).toContain("BROKER_NOTIFICATION_EVENTS");
    });

    it("BROKER_NOTIFICATION_EVENTS should include all 12 broker events", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "constants.ts"), "utf-8");
      expect(content).toContain("buyer_pursued_deal");
      expect(content).toContain("buyer_pending_review");
      expect(content).toContain("nda_signed");
      expect(content).toContain("nda_declined");
      expect(content).toContain("ioi_submitted");
      expect(content).toContain("loi_submitted");
      expect(content).toContain("buyer_passed");
      expect(content).toContain("buyer_declined");
      expect(content).toContain("deal_close_reported");
      expect(content).toContain("new_message");
      expect(content).toContain("deal_status_changed_by_admin");
      expect(content).toContain("pending_action_reminder");
    });

    it("should export BUYER_NOTIFICATION_EVENTS from constants", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "constants.ts"), "utf-8");
      expect(content).toContain("BUYER_NOTIFICATION_EVENTS");
    });

    it("BUYER_NOTIFICATION_EVENTS should include all 9 buyer events", () => {
      const content = fs.readFileSync(path.join(SRC, "lib", "constants.ts"), "utf-8");
      expect(content).toContain("new_matched_deal");
      expect(content).toContain("nda_sent");
      expect(content).toContain("nda_approved");
      expect(content).toContain("nda_rejected");
      expect(content).toContain("cim_released");
      expect(content).toContain("deal_status_changed");
      expect(content).toContain("deal_terminated");
    });
  });

  // ─── API Routes ──────────────────────────────────────────────────
  describe("Settings API Routes", () => {
    it("should have profile update route at /api/settings/profile/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "settings", "profile", "route.ts"))
      ).toBe(true);
    });

    it("profile route should handle GET for current profile data", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function GET");
    });

    it("profile route should handle PATCH for updating profile", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function PATCH");
    });

    it("profile route should update both users and firms tables", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
        "utf-8"
      );
      expect(content).toContain('from("users")');
      expect(content).toContain('from("firms")');
    });

    it("profile route should require approved authentication", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("requireApprovedUser");
    });

    it("profile route should validate buyerType before updating users", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("settingsProfileUpdateSchema.safeParse");
      expect(content).toContain("status: 400");
    });

    it("profile route should only write buyer_type for buyer users", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
        "utf-8"
      );
      expect(content).toContain('profile.role === "buyer"');
      expect(content).toContain("userUpdate.buyer_type");
    });

    it("should have notifications route at /api/settings/notifications/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "settings", "notifications", "route.ts"))
      ).toBe(true);
    });

    it("notifications route should handle GET for current preferences", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "notifications", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function GET");
    });

    it("notifications route should handle PATCH for updating preferences", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "notifications", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function PATCH");
    });

    it("notifications route should read/write notification_preferences table", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "notifications", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("notification_preferences");
    });

    it("notifications route should use upsert for preferences", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "notifications", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("upsert");
    });

    it("should have delete account route at /api/settings/delete-account/route.ts", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"))
      ).toBe(true);
    });

    it("delete account route should handle POST", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("export async function POST");
    });

    it("delete account route should require confirmation string 'DELETE'", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("DELETE");
    });

    it("delete account route should use admin client for cross-table operations", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("createAdminClient");
    });
  });

  // ─── Broker Delete Account Logic ─────────────────────────────────
  describe("Broker Account Deletion", () => {
    it("delete account should terminate all active deals for broker", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("terminated");
      expect(content).toContain('from("deals")');
    });

    it("delete account should notify buyers when deals are terminated", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("notifyBuyers");
    });

    it("delete account should check if user is only firm member", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("firm_id");
    });

    it("delete account should delete firm if user is sole member", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain('from("firms")');
      expect(content).toContain("delete");
    });

    it("delete account should delete auth record", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("auth.admin");
      expect(content).toContain("deleteUser");
    });
  });

  // ─── Buyer Delete Account Logic ──────────────────────────────────
  describe("Buyer Account Deletion", () => {
    it("delete account should set all buyer engagements to passed", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "api", "settings", "delete-account", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("passed");
      expect(content).toContain("deal_engagements");
    });
  });

  // ─── Settings Page ──────────────────────────────────────────────
  describe("Settings Page", () => {
    it("should have settings page at (auth)/settings/page.tsx", () => {
      expect(
        fs.existsSync(path.join(SRC, "app", "(auth)", "settings", "page.tsx"))
      ).toBe(true);
    });

    it("settings page should have Edit Profile section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Edit Profile");
    });

    it("settings page should have Notification Preferences section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Notification Preferences");
    });

    it("settings page should have Delete Account section", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("Delete Account");
    });

    it("settings page should have red delete button", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("red");
    });

    it("settings page should have DELETE confirmation input", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain('DELETE');
    });
  });

  // ─── Broker Profile Fields ────────────────────────────────────
  describe("Broker Profile Edit Fields", () => {
    it("settings page should have firm name field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("firmName");
    });

    it("settings page should have description field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("description");
    });

    it("settings page should have location field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("location");
    });

    it("settings page should have industry focus field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("industryFocus");
    });

    it("settings page should have website field", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("website");
    });
  });

  // ─── Buyer Profile Fields ─────────────────────────────────────
  describe("Buyer Profile Edit Fields", () => {
    it("settings page should have buyer type field for buyers", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("buyerType");
    });

    it("settings page should send empty buyerType so buyers can clear it", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain('buyerType === ""');
      expect(content).toContain("payload.buyerType = buyerType");
    });

    it("settings page should have AUM field for buyers", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("aum");
    });
  });

  // ─── Notification Toggle Grid ─────────────────────────────────
  describe("Notification Toggle Grid", () => {
    it("settings page should have Email toggle column", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("email");
    });

    it("settings page should have In-Platform toggle column", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("in_platform");
    });

    it("settings page should provide unique accessible names for notification checkboxes", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain('aria-label={`${event.label} email`}');
      expect(content).toContain('aria-label={`${event.label} in-platform`}');
    });

    it("settings page should fetch from /api/settings/notifications", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/settings/notifications");
    });

    it("settings page should fetch profile from /api/settings/profile", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/settings/profile");
    });
  });

  // ─── Confirmation Modal ───────────────────────────────────────
  describe("Delete Account Confirmation", () => {
    it("settings page should have confirmation modal", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("confirmDelete");
    });

    it("settings page should submit to /api/settings/delete-account", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/settings/delete-account");
    });

    it("settings page should redirect to landing page after deletion", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain('router.push("/")');
    });
  });

  // ─── Broker Credentials Field ─────────────────────────────────
  describe("Broker-Specific Profile Fields", () => {
    it("settings page should have credentials field for brokers", () => {
      const content = fs.readFileSync(
        path.join(SRC, "app", "(auth)", "settings", "page.tsx"),
        "utf-8"
      );
      expect(content).toContain("credentials");
    });
  });
});
