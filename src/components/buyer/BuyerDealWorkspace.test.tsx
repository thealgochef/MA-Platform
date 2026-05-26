import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BuyerDealWorkspace from "./BuyerDealWorkspace";

const mockUseParams = vi.fn(() => ({ id: "deal-1" }));

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/lib/buyer-workflow-gating", () => ({
  canBuyerAccessCloseWorkflow: () => false,
  canBuyerAccessIoiWorkflow: () => false,
  canBuyerAccessLoiWorkflow: () => false,
}));

type DealWorkspaceResponse = {
  deal: {
    id: string;
    headline: string;
    description: string;
    industry: string;
    nda_type: "platform" | "custom";
    geography_display: string;
    status: string;
    revenue_year_1: number | null;
    revenue_year_2: number | null;
    revenue_year_3: number | null;
    ebitda_year_1: number | null;
    ebitda_year_2: number | null;
    ebitda_year_3: number | null;
  };
  engagement: {
    id: string;
    stage: string;
    nda_status: string;
    cim_released: boolean;
  };
};

function buildWorkspacePayload(ndaType: "platform" | "custom"): DealWorkspaceResponse {
  return {
    deal: {
      id: "deal-1",
      headline: "Acme Industrial",
      description: "A durable manufacturing business",
      industry: "Industrial",
      nda_type: ndaType,
      geography_display: "state",
      status: "active",
      revenue_year_1: null,
      revenue_year_2: null,
      revenue_year_3: null,
      ebitda_year_1: null,
      ebitda_year_2: null,
      ebitda_year_3: null,
    },
    engagement: {
      id: "engagement-1",
      stage: "nda_signed",
      nda_status: "signed",
      cim_released: false,
    },
  };
}

describe("BuyerDealWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a View NDA action when engagement NDA status is signed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => buildWorkspacePayload("platform"),
      }))
    );

    render(<BuyerDealWorkspace />);

    const viewNdaLink = await screen.findByRole("link", { name: "View NDA" });

    expect(viewNdaLink).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign NDA" })).not.toBeInTheDocument();
  });

  it("routes View NDA to the document API route for custom NDA deals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => buildWorkspacePayload("custom"),
      }))
    );

    render(<BuyerDealWorkspace />);

    const viewNdaLink = await screen.findByRole("link", { name: "View NDA" });

    expect(viewNdaLink).toHaveAttribute("href", "/api/deals/deal-1/nda/document");
  });

  it("routes View NDA to the in-app NDA page for platform NDA deals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => buildWorkspacePayload("platform"),
      }))
    );

    render(<BuyerDealWorkspace />);

    const viewNdaLink = await screen.findByRole("link", { name: "View NDA" });

    expect(viewNdaLink).toHaveAttribute("href", "/deals/deal-1/nda");
  });
});
