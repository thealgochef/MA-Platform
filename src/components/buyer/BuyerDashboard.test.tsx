import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BuyerDashboard from "./BuyerDashboard";

describe("BuyerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/projects") {
          return {
            ok: true,
            json: async () => ({
              projects: [],
            }),
          };
        }

        if (url === "/api/buyer/analytics") {
          return {
            ok: true,
            json: async () => ({
              analytics: {
                pursuing: 4,
                passed: 2,
                ndaSigned: 1,
                ioisSubmitted: 1,
                loisSubmitted: 0,
                dealsByStage: {},
                avgRevenue: null,
                avgEbitda: null,
                avgMatchedRevenue: null,
                avgMatchedEbitda: null,
                dealsByIndustry: {},
              },
              activity: [],
            }),
          };
        }

        return {
          ok: false,
          json: async () => ({}),
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("links Deals Pursuing, Deals Passed, Deals by Stage, and Deals by Industry to engagements page", async () => {
    render(<BuyerDashboard />);

    const pursuingLink = await screen.findByRole("link", {
      name: "View all deals pursuing across projects",
    });
    const passedLink = screen.getByRole("link", {
      name: "View all deals passed across projects",
    });
    const byStageLink = screen.getByRole("link", {
      name: "View all deals by stage across projects",
    });
    const byIndustryLink = screen.getByRole("link", {
      name: "View all deals by industry across projects",
    });

    expect(pursuingLink).toHaveAttribute("href", "/projects/engagements");
    expect(passedLink).toHaveAttribute("href", "/projects/engagements");
    expect(byStageLink).toHaveAttribute("href", "/projects/engagements");
    expect(byIndustryLink).toHaveAttribute("href", "/projects/engagements");
    expect(within(byIndustryLink).getByText("No data yet.")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "NDAs Signed" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "IOIs Submitted" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LOIs Submitted" })).not.toBeInTheDocument();
  });

  it("clears loading state when a dashboard fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/projects") {
          return {
            ok: true,
            json: async () => ({ projects: [] }),
          };
        }

        if (url === "/api/buyer/analytics") {
          throw new Error("network down");
        }

        return {
          ok: false,
          json: async () => ({}),
        };
      })
    );

    render(<BuyerDashboard />);

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Loading dashboard...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Your Projects")).toBeInTheDocument();
  });
});
