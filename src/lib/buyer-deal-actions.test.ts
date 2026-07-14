import { describe, expect, it, vi } from "vitest";
import { getBuyerDealActions } from "@/lib/buyer-deal-actions";

function createDeal(overrides?: {
  id?: string;
  status?: string;
  engagement?: {
    stage?: string | null;
    nda_status?: string | null;
    cim_released?: boolean | null;
  } | null;
}) {
  return {
    id: overrides?.id ?? "deal-1",
    status: overrides?.status ?? "active",
    engagement: overrides?.engagement ?? null,
  };
}

function createOptions(overrides?: { actionLoadingDealId?: string | null; isApprovedBuyer?: boolean }) {
  return {
    onNavigate: vi.fn(),
    onPursue: vi.fn(),
    onDecline: vi.fn(),
    actionLoadingDealId: overrides?.actionLoadingDealId ?? null,
    isApprovedBuyer: overrides?.isApprovedBuyer ?? true,
  };
}

describe("getBuyerDealActions", () => {
  it("returns Pursue + Decline for unengaged deals and wires handlers", () => {
    const deal = createDeal();
    const options = createOptions();

    const actions = getBuyerDealActions(deal, options);

    expect(actions).toHaveLength(2);
    expect(actions[0]?.label).toBe("Pursue");
    expect(actions[1]).toMatchObject({ label: "Decline", variant: "outlined" });

    actions[0]?.onClick();
    actions[1]?.onClick();

    expect(options.onPursue).toHaveBeenCalledWith("deal-1");
    expect(options.onDecline).toHaveBeenCalledWith("deal-1");
  });

  it("disables unengaged Pursue + Decline while action is loading", () => {
    const deal = createDeal();
    const actions = getBuyerDealActions(deal, createOptions({ actionLoadingDealId: "deal-1" }));

    expect(actions).toHaveLength(2);
    expect(actions[0]?.disabled).toBe(true);
    expect(actions[1]?.disabled).toBe(true);
  });

  it("returns single Pursue action for declined deals", () => {
    const deal = createDeal({
      engagement: {
        stage: "declined",
        nda_status: "not_signed",
      },
    });
    const options = createOptions();

    const actions = getBuyerDealActions(deal, options);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe("Pursue");

    actions[0]?.onClick();
    expect(options.onPursue).toHaveBeenCalledWith("deal-1");
  });

  it("returns Sign NDA action for nda_pending and uses encoded deal route", () => {
    const deal = createDeal({
      id: "deal/abc?x=1",
      engagement: {
        stage: "nda_pending",
        nda_status: "pending",
      },
    });
    const options = createOptions();

    const actions = getBuyerDealActions(deal, options);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe("Sign NDA");

    actions[0]?.onClick();
    expect(options.onNavigate).toHaveBeenCalledWith("/deals/deal%2Fabc%3Fx%3D1/nda");
  });

  it("returns IOI action when workflow is available for approved buyer", () => {
    const deal = createDeal({
      status: "accepting_iois",
      engagement: {
        stage: "nda_signed",
        nda_status: "signed",
        cim_released: true,
      },
    });
    const options = createOptions();

    const actions = getBuyerDealActions(deal, options);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe("Submit IOI");

    actions[0]?.onClick();
    expect(options.onNavigate).toHaveBeenCalledWith("/deals/deal-1/ioi");
  });

  it("returns no IOI/LOI workflow actions when buyer is not approved", () => {
    const ioiDeal = createDeal({
      status: "accepting_iois",
      engagement: {
        stage: "ioi_submitted",
        nda_status: "signed",
        cim_released: true,
      },
    });

    const loiDeal = createDeal({
      status: "accepting_lois",
      engagement: {
        stage: "ioi_submitted",
        nda_status: "signed",
        cim_released: true,
      },
    });

    expect(getBuyerDealActions(ioiDeal, createOptions({ isApprovedBuyer: false }))).toEqual([]);
    expect(getBuyerDealActions(loiDeal, createOptions({ isApprovedBuyer: false }))).toEqual([]);
  });

  it("returns View IOI for submitted IOI in accepting_iois", () => {
    const deal = createDeal({
      status: "accepting_iois",
      engagement: {
        stage: "ioi_submitted",
        nda_status: "signed",
        cim_released: true,
      },
    });
    const options = createOptions();

    const actions = getBuyerDealActions(deal, options);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe("View IOI");
  });

  it("returns Submit LOI or View LOI based on LOI stage", () => {
    const submitLoiActions = getBuyerDealActions(
      createDeal({
        status: "accepting_lois",
        engagement: {
          stage: "ioi_submitted",
          nda_status: "signed",
          cim_released: true,
        },
      }),
      createOptions()
    );

    const viewLoiActions = getBuyerDealActions(
      createDeal({
        status: "accepting_lois",
        engagement: {
          stage: "loi_submitted",
          nda_status: "signed",
          cim_released: true,
        },
      }),
      createOptions()
    );

    expect(submitLoiActions).toHaveLength(1);
    expect(submitLoiActions[0]?.label).toBe("Submit LOI");

    expect(viewLoiActions).toHaveLength(1);
    expect(viewLoiActions[0]?.label).toBe("View LOI");
  });
});
