import { describe, expect, it } from "vitest";
import {
  canBuyerAccessIoiWorkflow,
  canBuyerAccessLoiWorkflow,
  canBuyerAccessCloseWorkflow,
} from "@/lib/buyer-workflow-gating";

describe("buyer workflow gating predicates", () => {
  describe("canBuyerAccessIoiWorkflow", () => {
    it("returns true for approved buyer with accepting_iois and nda_signed engagement", () => {
      const result = canBuyerAccessIoiWorkflow({
        isApprovedBuyer: true,
        dealStatus: "accepting_iois",
        engagement: {
          nda_status: "signed",
          cim_released: true,
          stage: "nda_signed",
        },
      });

      expect(result).toBe(true);
    });

    it("returns true when stage is already ioi_submitted", () => {
      const result = canBuyerAccessIoiWorkflow({
        isApprovedBuyer: true,
        dealStatus: "accepting_iois",
        engagement: {
          nda_status: "signed",
          cim_released: true,
          stage: "ioi_submitted",
        },
      });

      expect(result).toBe(true);
    });

    it("returns false when not approved buyer", () => {
      const result = canBuyerAccessIoiWorkflow({
        isApprovedBuyer: false,
        dealStatus: "accepting_iois",
        engagement: {
          nda_status: "signed",
          cim_released: true,
          stage: "nda_signed",
        },
      });

      expect(result).toBe(false);
    });

    it("returns false when deal status is not accepting_iois", () => {
      const result = canBuyerAccessIoiWorkflow({
        isApprovedBuyer: true,
        dealStatus: "accepting_lois",
        engagement: {
          nda_status: "signed",
          cim_released: true,
          stage: "nda_signed",
        },
      });

      expect(result).toBe(false);
    });

    it("returns false when engagement is missing, nda unsigned, cim not released, or stage is invalid", () => {
      expect(
        canBuyerAccessIoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_iois",
          engagement: null,
        })
      ).toBe(false);

      expect(
        canBuyerAccessIoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_iois",
          engagement: {
            nda_status: "pending",
            cim_released: true,
            stage: "nda_signed",
          },
        })
      ).toBe(false);

      expect(
        canBuyerAccessIoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_iois",
          engagement: {
            nda_status: "signed",
            cim_released: false,
            stage: "nda_signed",
          },
        })
      ).toBe(false);

      expect(
        canBuyerAccessIoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_iois",
          engagement: {
            nda_status: "signed",
            cim_released: true,
            stage: "diligence",
          },
        })
      ).toBe(false);
    });
  });

  describe("canBuyerAccessLoiWorkflow", () => {
    it("returns true for approved buyer with accepting_lois and ioi_submitted stage", () => {
      const result = canBuyerAccessLoiWorkflow({
        isApprovedBuyer: true,
        dealStatus: "accepting_lois",
        engagement: {
          nda_status: "signed",
          stage: "ioi_submitted",
        },
      });

      expect(result).toBe(true);
    });

    it("returns true when stage is already loi_submitted", () => {
      const result = canBuyerAccessLoiWorkflow({
        isApprovedBuyer: true,
        dealStatus: "accepting_lois",
        engagement: {
          nda_status: "signed",
          stage: "loi_submitted",
        },
      });

      expect(result).toBe(true);
    });

    it("returns false when not approved, wrong deal status, unsigned nda, missing engagement, or invalid stage", () => {
      expect(
        canBuyerAccessLoiWorkflow({
          isApprovedBuyer: false,
          dealStatus: "accepting_lois",
          engagement: { nda_status: "signed", stage: "ioi_submitted" },
        })
      ).toBe(false);

      expect(
        canBuyerAccessLoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_iois",
          engagement: { nda_status: "signed", stage: "ioi_submitted" },
        })
      ).toBe(false);

      expect(
        canBuyerAccessLoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_lois",
          engagement: { nda_status: "pending", stage: "ioi_submitted" },
        })
      ).toBe(false);

      expect(
        canBuyerAccessLoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_lois",
          engagement: null,
        })
      ).toBe(false);

      expect(
        canBuyerAccessLoiWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_lois",
          engagement: { nda_status: "signed", stage: "nda_signed" },
        })
      ).toBe(false);
    });
  });

  describe("canBuyerAccessCloseWorkflow", () => {
    it("returns true only for approved buyer on closed deal with closed stage", () => {
      const result = canBuyerAccessCloseWorkflow({
        isApprovedBuyer: true,
        dealStatus: "closed",
        engagement: { stage: "closed" },
      });

      expect(result).toBe(true);
    });

    it("returns false for non-approved buyer, non-closed deal, missing engagement, or non-closed stage", () => {
      expect(
        canBuyerAccessCloseWorkflow({
          isApprovedBuyer: false,
          dealStatus: "closed",
          engagement: { stage: "closed" },
        })
      ).toBe(false);

      expect(
        canBuyerAccessCloseWorkflow({
          isApprovedBuyer: true,
          dealStatus: "accepting_lois",
          engagement: { stage: "closed" },
        })
      ).toBe(false);

      expect(
        canBuyerAccessCloseWorkflow({
          isApprovedBuyer: true,
          dealStatus: "closed",
          engagement: null,
        })
      ).toBe(false);

      expect(
        canBuyerAccessCloseWorkflow({
          isApprovedBuyer: true,
          dealStatus: "closed",
          engagement: { stage: "loi_submitted" },
        })
      ).toBe(false);
    });
  });
});
