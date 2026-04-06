import { describe, it, expect } from "vitest";
import {
  getRedirectForUser,
  isProtectedRoute,
  isPublicOnlyRoute,
  getRequiredRole,
} from "@/lib/auth-helpers";

describe("Phase 2: Middleware Auth Logic", () => {
  describe("isProtectedRoute", () => {
    it("should mark broker routes as protected", () => {
      expect(isProtectedRoute("/dashboard")).toBe(true);
      expect(isProtectedRoute("/deals/new")).toBe(true);
      expect(isProtectedRoute("/deals/123")).toBe(true);
      expect(isProtectedRoute("/settings")).toBe(true);
    });

    it("should mark buyer routes as protected", () => {
      expect(isProtectedRoute("/projects/new")).toBe(true);
      expect(isProtectedRoute("/browse")).toBe(true);
    });

    it("should mark admin routes as protected", () => {
      expect(isProtectedRoute("/admin")).toBe(true);
    });

    it("should mark messaging routes as protected", () => {
      expect(isProtectedRoute("/messages")).toBe(true);
      expect(isProtectedRoute("/messages/123")).toBe(true);
    });

    it("should NOT mark public routes as protected", () => {
      expect(isProtectedRoute("/login")).toBe(false);
      expect(isProtectedRoute("/pending-approval")).toBe(false);
      expect(isProtectedRoute("/for-buyers")).toBe(false);
      expect(isProtectedRoute("/for-brokers")).toBe(false);
      expect(isProtectedRoute("/about")).toBe(false);
      expect(isProtectedRoute("/how-it-works")).toBe(false);
      expect(isProtectedRoute("/contact")).toBe(false);
      expect(isProtectedRoute("/privacy")).toBe(false);
      expect(isProtectedRoute("/terms")).toBe(false);
    });

    it("should mark signup routes as protected (require auth)", () => {
      expect(isProtectedRoute("/signup/broker")).toBe(true);
      expect(isProtectedRoute("/signup/buyer")).toBe(true);
      expect(isProtectedRoute("/signup/select-role")).toBe(true);
    });

    it("should NOT mark the homepage as protected", () => {
      expect(isProtectedRoute("/")).toBe(false);
    });

    it("should NOT mark API auth routes as protected", () => {
      expect(isProtectedRoute("/api/auth/callback")).toBe(false);
    });

    it("should NOT mark shared deal pages as protected", () => {
      expect(isProtectedRoute("/shared/123")).toBe(false);
    });
  });

  describe("isPublicOnlyRoute", () => {
    it("should mark login as public-only", () => {
      expect(isPublicOnlyRoute("/login")).toBe(true);
    });

    it("should NOT mark signup pages as public-only (they require auth)", () => {
      expect(isPublicOnlyRoute("/signup/broker")).toBe(false);
      expect(isPublicOnlyRoute("/signup/buyer")).toBe(false);
      expect(isPublicOnlyRoute("/signup/select-role")).toBe(false);
    });

    it("should NOT mark dashboard as public-only", () => {
      expect(isPublicOnlyRoute("/dashboard")).toBe(false);
    });
  });

  describe("getRequiredRole", () => {
    it("should return 'broker' for broker routes", () => {
      expect(getRequiredRole("/deals/new")).toBe("broker");
      expect(getRequiredRole("/deals/123/edit")).toBe("broker");
      expect(getRequiredRole("/deals/123/preview")).toBe("broker");
      expect(getRequiredRole("/deals/123/ioi-compare")).toBe("broker");
    });

    it("should return 'buyer' for buyer routes", () => {
      expect(getRequiredRole("/projects/new")).toBe("buyer");
      expect(getRequiredRole("/projects/123")).toBe("buyer");
      expect(getRequiredRole("/browse")).toBe("buyer");
    });

    it("should return 'admin' for admin routes", () => {
      expect(getRequiredRole("/admin")).toBe("admin");
    });

    it("should return null for shared routes like dashboard, messages, settings", () => {
      expect(getRequiredRole("/dashboard")).toBeNull();
      expect(getRequiredRole("/messages")).toBeNull();
      expect(getRequiredRole("/settings")).toBeNull();
    });
  });

  describe("getRedirectForUser", () => {
    it("should redirect pending users without agreement to /signup/select-role for protected routes", () => {
      const result = getRedirectForUser(
        { role: "broker", status: "pending", membership_agreement_signed: false },
        "/dashboard"
      );
      expect(result).toBe("/signup/select-role");
    });

    it("should redirect pending users with agreement to /pending-approval for protected routes", () => {
      const result = getRedirectForUser(
        { role: "broker", status: "pending", membership_agreement_signed: true },
        "/dashboard"
      );
      expect(result).toBe("/pending-approval");
    });

    it("should redirect rejected users to /login with rejection message", () => {
      const result = getRedirectForUser(
        { role: "buyer", status: "rejected" },
        "/dashboard"
      );
      expect(result).toBe("/login?error=rejected");
    });

    it("should redirect suspended users to /login", () => {
      const result = getRedirectForUser(
        { role: "broker", status: "suspended" },
        "/dashboard"
      );
      expect(result).toBe("/login?error=suspended");
    });

    it("should redirect banned users to /login", () => {
      const result = getRedirectForUser(
        { role: "buyer", status: "banned" },
        "/dashboard"
      );
      expect(result).toBe("/login?error=banned");
    });

    it("should return null for approved broker accessing broker routes", () => {
      const result = getRedirectForUser(
        { role: "broker", status: "approved", membership_agreement_signed: true },
        "/deals/new"
      );
      expect(result).toBeNull();
    });

    it("should return null for approved buyer accessing buyer routes", () => {
      const result = getRedirectForUser(
        { role: "buyer", status: "approved", membership_agreement_signed: true },
        "/browse"
      );
      expect(result).toBeNull();
    });

    it("should redirect broker away from buyer-only routes", () => {
      const result = getRedirectForUser(
        { role: "broker", status: "approved", membership_agreement_signed: true },
        "/browse"
      );
      expect(result).toBe("/dashboard");
    });

    it("should redirect buyer away from broker-only routes", () => {
      const result = getRedirectForUser(
        { role: "buyer", status: "approved", membership_agreement_signed: true },
        "/deals/new"
      );
      expect(result).toBe("/dashboard");
    });

    it("should redirect non-admin away from admin routes", () => {
      const result = getRedirectForUser(
        { role: "broker", status: "approved", membership_agreement_signed: true },
        "/admin"
      );
      expect(result).toBe("/dashboard");
    });

    it("should return null for admin accessing admin routes", () => {
      const result = getRedirectForUser(
        { role: "admin", status: "approved", membership_agreement_signed: true },
        "/admin"
      );
      expect(result).toBeNull();
    });

    it("should return null for approved users on shared routes (dashboard, messages, settings)", () => {
      expect(
        getRedirectForUser({ role: "broker", status: "approved", membership_agreement_signed: true }, "/dashboard")
      ).toBeNull();
      expect(
        getRedirectForUser({ role: "buyer", status: "approved", membership_agreement_signed: true }, "/messages")
      ).toBeNull();
      expect(
        getRedirectForUser({ role: "broker", status: "approved", membership_agreement_signed: true }, "/settings")
      ).toBeNull();
    });

    it("should allow pending users to access pending-approval page", () => {
      const result = getRedirectForUser(
        { role: "broker", status: "pending", membership_agreement_signed: true },
        "/pending-approval"
      );
      expect(result).toBeNull();
    });

    it("should allow pending users to access signup pages", () => {
      expect(
        getRedirectForUser({ role: "broker", status: "pending" }, "/signup/broker")
      ).toBeNull();
    });

    // DEV auto-approve: approved users without agreement must still complete signup
    it("should redirect approved users without membership_agreement_signed to /signup/select-role", () => {
      const result = getRedirectForUser(
        { role: "buyer", status: "approved", membership_agreement_signed: false },
        "/dashboard"
      );
      expect(result).toBe("/signup/select-role");
    });

    it("should allow approved users without agreement to access signup flow pages", () => {
      expect(
        getRedirectForUser({ role: "buyer", status: "approved", membership_agreement_signed: false }, "/signup/select-role")
      ).toBeNull();
      expect(
        getRedirectForUser({ role: "buyer", status: "approved", membership_agreement_signed: false }, "/signup/buyer")
      ).toBeNull();
      expect(
        getRedirectForUser({ role: "buyer", status: "approved", membership_agreement_signed: false }, "/api/signup/buyer")
      ).toBeNull();
    });
  });
});
