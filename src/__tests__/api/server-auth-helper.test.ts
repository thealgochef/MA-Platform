import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../");

describe("API auth helper", () => {
  it("centralizes API user, approval, and role guards", () => {
    const content = fs.readFileSync(path.join(SRC, "server", "auth.ts"), "utf-8");

    expect(content).toContain('createClient } from "@/lib/supabase/server"');
    expect(content).toContain("export async function requireUser");
    expect(content).toContain("export async function requireApprovedUser");
    expect(content).toContain("export async function requireRole");
    expect(content).toContain("Unauthorized");
    expect(content).toContain("Forbidden");
    expect(content).toContain("Profile not found");
  });

  it("provides reusable project and deal ownership helpers", () => {
    const content = fs.readFileSync(path.join(SRC, "server", "auth.ts"), "utf-8");

    expect(content).toContain("export async function requireBuyerProjectAccess");
    expect(content).toContain("buyer_projects");
    expect(content).toContain("buyer_user_id");
    expect(content).toContain("export async function requireBrokerDealAccess");
    expect(content).toContain("deals");
    expect(content).toContain("firm_id");
  });

  it("migrates low-risk routes to shared guards", () => {
    const routes = [
      path.join(SRC, "app", "api", "projects", "route.ts"),
      path.join(SRC, "app", "api", "projects", "[id]", "route.ts"),
      path.join(SRC, "app", "api", "settings", "notifications", "route.ts"),
      path.join(SRC, "app", "api", "settings", "profile", "route.ts"),
      path.join(SRC, "app", "api", "buyer", "analytics", "route.ts"),
    ];

    for (const route of routes) {
      const content = fs.readFileSync(route, "utf-8");
      expect(content).toContain("@/server/auth");
    }
  });
});
