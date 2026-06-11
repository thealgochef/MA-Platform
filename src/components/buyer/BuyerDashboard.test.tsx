import { render, screen, waitFor } from "@testing-library/react";
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

  it("makes only Deals Pursuing KPI card navigate to engagements page", async () => {
    render(<BuyerDashboard />);

    const pursuingLink = await screen.findByRole("link", {
      name: "View all deals pursuing across projects",
    });

    expect(pursuingLink).toHaveAttribute("href", "/projects/engagements");
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Deals Passed" })).not.toBeInTheDocument();
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
