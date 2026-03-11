import { describe, it, expect } from "vitest";
import { VALID_DEAL_TRANSITIONS, FEE_RATES } from "@/lib/constants";

// Business logic function to be implemented
import { isValidDealTransition, calculateFees } from "@/lib/deal-status";

describe("Deal Status Transitions", () => {
  describe("isValidDealTransition", () => {
    it("should allow draft → accepting_iois", () => {
      expect(isValidDealTransition("draft", "accepting_iois")).toBe(true);
    });

    it("should not allow draft → accepting_lois (must go through accepting_iois)", () => {
      expect(isValidDealTransition("draft", "accepting_lois")).toBe(false);
    });

    it("should not allow draft → closed", () => {
      expect(isValidDealTransition("draft", "closed")).toBe(false);
    });

    it("should allow accepting_iois → accepting_lois", () => {
      expect(isValidDealTransition("accepting_iois", "accepting_lois")).toBe(true);
    });

    it("should allow accepting_iois → paused", () => {
      expect(isValidDealTransition("accepting_iois", "paused")).toBe(true);
    });

    it("should allow accepting_iois → terminated", () => {
      expect(isValidDealTransition("accepting_iois", "terminated")).toBe(true);
    });

    it("should not allow accepting_iois → draft (no going back to draft)", () => {
      expect(isValidDealTransition("accepting_iois", "draft")).toBe(false);
    });

    it("should allow accepting_lois → under_loi", () => {
      expect(isValidDealTransition("accepting_lois", "under_loi")).toBe(true);
    });

    it("should allow under_loi → closed", () => {
      expect(isValidDealTransition("under_loi", "closed")).toBe(true);
    });

    it("should allow paused → accepting_iois (reactivation)", () => {
      expect(isValidDealTransition("paused", "accepting_iois")).toBe(true);
    });

    it("should allow paused → accepting_lois (reactivation)", () => {
      expect(isValidDealTransition("paused", "accepting_lois")).toBe(true);
    });

    it("should allow paused → under_loi (reactivation)", () => {
      expect(isValidDealTransition("paused", "under_loi")).toBe(true);
    });

    it("should allow paused → terminated", () => {
      expect(isValidDealTransition("paused", "terminated")).toBe(true);
    });

    it("should not allow terminated → any state (terminal)", () => {
      expect(isValidDealTransition("terminated", "draft")).toBe(false);
      expect(isValidDealTransition("terminated", "accepting_iois")).toBe(false);
      expect(isValidDealTransition("terminated", "paused")).toBe(false);
    });

    it("should not allow closed → any state (terminal)", () => {
      expect(isValidDealTransition("closed", "draft")).toBe(false);
      expect(isValidDealTransition("closed", "accepting_iois")).toBe(false);
      expect(isValidDealTransition("closed", "terminated")).toBe(false);
    });

    it("should not allow same-state transitions", () => {
      expect(isValidDealTransition("draft", "draft")).toBe(false);
      expect(isValidDealTransition("accepting_iois", "accepting_iois")).toBe(false);
    });

    it("should cover all transitions defined in VALID_DEAL_TRANSITIONS", () => {
      for (const [from, toList] of Object.entries(VALID_DEAL_TRANSITIONS)) {
        for (const to of toList) {
          expect(isValidDealTransition(from, to)).toBe(true);
        }
      }
    });
  });

  describe("calculateFees", () => {
    it("should calculate 1.25% success fee", () => {
      const { successFee } = calculateFees(10_000_000);
      expect(successFee).toBe(125_000);
    });

    it("should calculate 0.25% broker incentive", () => {
      const { brokerIncentive } = calculateFees(10_000_000);
      expect(brokerIncentive).toBe(25_000);
    });

    it("should handle zero enterprise value", () => {
      const { successFee, brokerIncentive } = calculateFees(0);
      expect(successFee).toBe(0);
      expect(brokerIncentive).toBe(0);
    });

    it("should handle large enterprise values", () => {
      const { successFee, brokerIncentive } = calculateFees(500_000_000);
      expect(successFee).toBe(6_250_000);
      expect(brokerIncentive).toBe(1_250_000);
    });

    it("should use correct fee rates from constants", () => {
      const ev = 1_000_000;
      const { successFee, brokerIncentive } = calculateFees(ev);
      expect(successFee).toBe(ev * FEE_RATES.SUCCESS_FEE);
      expect(brokerIncentive).toBe(ev * FEE_RATES.BROKER_INCENTIVE);
    });
  });
});
