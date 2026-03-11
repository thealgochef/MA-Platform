import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  isProtectedRoute,
  isPublicOnlyRoute,
  getRedirectForUser,
} from "@/lib/auth-helpers";

const SRC = path.resolve(__dirname, "../../");

describe("Auth Flow v2: Login → Google OAuth → Select Role → Signup → Pending", () => {
  describe("Login page", () => {
    const loginPath = path.join(SRC, "app", "(public)", "login", "page.tsx");

    it("should have login page", () => {
      expect(fs.existsSync(loginPath)).toBe(true);
    });

    it("should have Google OAuth button", () => {
      const content = fs.readFileSync(loginPath, "utf-8");
      expect(content).toContain("signInWithOAuth");
      expect(content).toContain("google");
    });

    it("should NOT have broker/buyer signup links on login page", () => {
      const content = fs.readFileSync(loginPath, "utf-8");
      // The login page should not have "I'm a Broker" / "I'm a Buyer" links
      expect(content).not.toContain("/signup/broker");
      expect(content).not.toContain("/signup/buyer");
    });

    it("should NOT have email/password auth", () => {
      const content = fs.readFileSync(loginPath, "utf-8");
      expect(content).not.toContain("signInWithPassword");
      expect(content).not.toContain('type="password"');
    });
  });

  describe("Select Role page", () => {
    const selectRolePath = path.join(
      SRC,
      "app",
      "(public)",
      "signup",
      "select-role",
      "page.tsx"
    );

    it("should have select-role page", () => {
      expect(fs.existsSync(selectRolePath)).toBe(true);
    });

    it("should link to broker signup", () => {
      const content = fs.readFileSync(selectRolePath, "utf-8");
      expect(content).toContain("/signup/broker");
    });

    it("should link to buyer signup", () => {
      const content = fs.readFileSync(selectRolePath, "utf-8");
      expect(content).toContain("/signup/buyer");
    });

    it("should be a client component", () => {
      const content = fs.readFileSync(selectRolePath, "utf-8");
      expect(content).toContain("use client");
    });
  });

  describe("Auth callback routing", () => {
    const callbackPath = path.join(
      SRC,
      "app",
      "api",
      "auth",
      "callback",
      "route.ts"
    );

    it("should redirect new users to /signup/select-role", () => {
      const content = fs.readFileSync(callbackPath, "utf-8");
      expect(content).toContain("/signup/select-role");
    });

    it("should redirect pending users without membership agreement to /signup/select-role", () => {
      const content = fs.readFileSync(callbackPath, "utf-8");
      // When profile exists, status is pending, and membership_agreement_signed is false
      expect(content).toContain("membership_agreement_signed");
      expect(content).toContain("/signup/select-role");
    });

    it("should redirect pending users with membership agreement to /pending-approval", () => {
      const content = fs.readFileSync(callbackPath, "utf-8");
      expect(content).toContain("/pending-approval");
    });

    it("should redirect approved users to dashboard or admin", () => {
      const content = fs.readFileSync(callbackPath, "utf-8");
      expect(content).toContain("/dashboard");
      expect(content).toContain("/admin");
    });
  });

  describe("Auth helpers routing", () => {
    it("should make signup routes protected (require auth)", () => {
      expect(isProtectedRoute("/signup/select-role")).toBe(true);
      expect(isProtectedRoute("/signup/broker")).toBe(true);
      expect(isProtectedRoute("/signup/buyer")).toBe(true);
    });

    it("should keep login as public", () => {
      expect(isProtectedRoute("/login")).toBe(false);
    });

    it("should only mark /login as public-only (not signup pages)", () => {
      expect(isPublicOnlyRoute("/login")).toBe(true);
      expect(isPublicOnlyRoute("/signup/broker")).toBe(false);
      expect(isPublicOnlyRoute("/signup/buyer")).toBe(false);
      expect(isPublicOnlyRoute("/signup/select-role")).toBe(false);
    });

    it("should allow pending users to access signup flow pages", () => {
      expect(
        getRedirectForUser(
          { role: "buyer", status: "pending", membership_agreement_signed: false },
          "/signup/select-role"
        )
      ).toBeNull();
      expect(
        getRedirectForUser(
          { role: "buyer", status: "pending", membership_agreement_signed: false },
          "/signup/buyer"
        )
      ).toBeNull();
      expect(
        getRedirectForUser(
          { role: "broker", status: "pending", membership_agreement_signed: false },
          "/signup/broker"
        )
      ).toBeNull();
      expect(
        getRedirectForUser(
          { role: "buyer", status: "pending", membership_agreement_signed: true },
          "/pending-approval"
        )
      ).toBeNull();
    });

    it("should redirect pending users without agreement to /signup/select-role for protected routes", () => {
      expect(
        getRedirectForUser(
          { role: "buyer", status: "pending", membership_agreement_signed: false },
          "/dashboard"
        )
      ).toBe("/signup/select-role");
    });

    it("should redirect pending users with agreement to /pending-approval for protected routes", () => {
      expect(
        getRedirectForUser(
          { role: "buyer", status: "pending", membership_agreement_signed: true },
          "/dashboard"
        )
      ).toBe("/pending-approval");
    });
  });

  describe("Middleware", () => {
    it("should fetch membership_agreement_signed in middleware", () => {
      const content = fs.readFileSync(
        path.join(SRC, "middleware.ts"),
        "utf-8"
      );
      expect(content).toContain("membership_agreement_signed");
    });
  });
});
