import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type DashboardProjectRow = { id: string; name: string };
type DashboardSortModel = Array<{ field: string; sort?: "asc" | "desc" | null }>;

type MockDashboardDataGridProps = {
  rows: DashboardProjectRow[];
  detailColumns: Array<{ field?: string }>;
  rowSelectionModel: unknown;
  onRowSelectionModelChange: (model: unknown) => void;
  sortModel: DashboardSortModel;
  onSortModelChange: (sortModel: DashboardSortModel) => void;
  onRowClick: (row: DashboardProjectRow) => void;
  sortedCount: number;
  paginationModel: { page: number; pageSize: number };
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (pageSize: number) => void;
};

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
  capturedDataGridProps: [] as MockDashboardDataGridProps[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@/components/ui/DataGridTable", () => ({
  DataGridTable: (props: MockDashboardDataGridProps) => {
    mockState.capturedDataGridProps.push(props);

    return (
      <div data-testid="buyer-projects-data-grid">
        <p data-testid="buyer-grid-row-count">Rows: {props.rows.length}</p>
        <button
          type="button"
          onClick={() =>
            props.onRowSelectionModelChange({
              type: "include",
              ids: new Set(props.rows[0] ? [props.rows[0].id] : []),
            })
          }
        >
          Select first dashboard row
        </button>
        <button type="button" onClick={() => props.onSortModelChange([{ field: "name", sort: "asc" }])}>
          Sort dashboard rows by name ascending
        </button>
        <button type="button" onClick={() => props.onPageChange(1)}>
          Dashboard go to page 2
        </button>
        <button type="button" onClick={() => props.onRowsPerPageChange(25)}>
          Dashboard set rows per page to 25
        </button>
        <button type="button" onClick={() => props.onRowsPerPageChange(1)}>
          Dashboard set rows per page to 1
        </button>
        <button type="button" onClick={() => props.onRowClick(props.rows[0])} disabled={props.rows.length === 0}>
          Open first dashboard project row
        </button>
      </div>
    );
  },
}));

import BuyerDashboard from "./BuyerDashboard";

function getLatestGridProps() {
  return mockState.capturedDataGridProps.at(-1);
}

describe("BuyerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.capturedDataGridProps = [];

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
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("renders projects table when analytics request fails but projects succeed", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/projects") {
          return {
            ok: true,
            json: async () => ({
              projects: [
                {
                  id: "project-1",
                  name: "Project Orion",
                  industry: "Industrial",
                  revenue_min: 2,
                  revenue_max: 6,
                  ebitda_min: 1,
                  ebitda_max: 2,
                  location: "TX",
                  keywords: ["manufacturing"],
                  created_at: "2026-01-01T00:00:00.000Z",
                },
              ],
            }),
          };
        }

        if (url === "/api/buyer/analytics") {
          throw new Error("analytics unavailable");
        }

        return {
          ok: false,
          json: async () => ({}),
        };
      })
    );

    render(<BuyerDashboard />);

    expect(await screen.findByTestId("buyer-projects-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("buyer-grid-row-count")).toHaveTextContent("Rows: 1");
    expect(screen.queryByText("Create your first acquisition project")).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("logs an error when analytics response is non-OK and still renders projects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/projects") {
          return {
            ok: true,
            status: 200,
            statusText: "OK",
            json: async () => ({
              projects: [
                {
                  id: "project-1",
                  name: "Project Orion",
                  industry: "Industrial",
                  revenue_min: 2,
                  revenue_max: 6,
                  ebitda_min: 1,
                  ebitda_max: 2,
                  location: "TX",
                  keywords: ["manufacturing"],
                  created_at: "2026-01-01T00:00:00.000Z",
                },
              ],
            }),
          };
        }

        if (url === "/api/buyer/analytics") {
          return {
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            json: async () => ({}),
          };
        }

        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
        };
      })
    );

    render(<BuyerDashboard />);

    expect(await screen.findByTestId("buyer-projects-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("buyer-grid-row-count")).toHaveTextContent("Rows: 1");
    expect(screen.queryByText("Create your first acquisition project")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch buyer analytics", {
        status: 503,
        statusText: "Service Unavailable",
      });
    });

    consoleErrorSpy.mockRestore();
  });

  it("shows the create-project empty state and does not render the data grid when no projects are returned", async () => {
    render(<BuyerDashboard />);

    expect(await screen.findByText("Your Projects")).toBeInTheDocument();
    expect(screen.getByText("Create your first acquisition project")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Project" })).toHaveAttribute("href", "/projects/new");
    expect(screen.queryByTestId("buyer-projects-data-grid")).not.toBeInTheDocument();
    expect(mockState.capturedDataGridProps).toHaveLength(0);
  });

  it("renders DataGridTable with table callbacks and navigates on row click when projects exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/projects") {
          return {
            ok: true,
            json: async () => ({
              projects: [
                {
                  id: "project-1",
                  name: "Project Orion",
                  industry: "Industrial",
                  revenue_min: 2,
                  revenue_max: 6,
                  ebitda_min: 1,
                  ebitda_max: 2,
                  location: "TX",
                  keywords: ["manufacturing"],
                  created_at: "2026-01-01T00:00:00.000Z",
                },
                {
                  id: "project-2",
                  name: "Project Atlas",
                  industry: "Healthcare",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "CA",
                  keywords: [],
                  created_at: "2026-01-02T00:00:00.000Z",
                },
              ],
            }),
          };
        }

        if (url === "/api/buyer/analytics") {
          return {
            ok: true,
            json: async () => ({
              analytics: {
                pursuing: 1,
                passed: 0,
                ndaSigned: 0,
                ioisSubmitted: 0,
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

    render(<BuyerDashboard />);

    expect(await screen.findByTestId("buyer-projects-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("buyer-grid-row-count")).toHaveTextContent("Rows: 2");

    const latestGridProps = getLatestGridProps();
    expect(latestGridProps?.rows).toEqual([
      expect.objectContaining({ id: "project-1", name: "Project Orion" }),
      expect.objectContaining({ id: "project-2", name: "Project Atlas" }),
    ]);
    expect(latestGridProps?.detailColumns.map((column) => column.field)).toEqual([
      "name",
      "industry",
      "location",
      "revenue",
      "ebitda",
      "created_at",
    ]);
    expect(latestGridProps?.sortModel).toEqual([]);
    expect(latestGridProps?.paginationModel).toEqual({ page: 0, pageSize: 10 });
    expect(latestGridProps?.rowSelectionModel).toEqual({ type: "include", ids: new Set() });
    expect(latestGridProps?.onSortModelChange).toBeTypeOf("function");
    expect(latestGridProps?.onPageChange).toBeTypeOf("function");
    expect(latestGridProps?.onRowsPerPageChange).toBeTypeOf("function");
    expect(latestGridProps?.onRowSelectionModelChange).toBeTypeOf("function");
    expect(latestGridProps?.onRowClick).toBeTypeOf("function");

    fireEvent.click(screen.getByRole("button", { name: "Sort dashboard rows by name ascending" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.sortModel).toEqual([{ field: "name", sort: "asc" }]);
    });

    fireEvent.click(screen.getByRole("button", { name: "Dashboard set rows per page to 25" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 25 });
    });

    fireEvent.click(screen.getByRole("button", { name: "Dashboard set rows per page to 1" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 1 });
    });

    fireEvent.click(screen.getByRole("button", { name: "Dashboard go to page 2" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 1, pageSize: 1 });
    });

    fireEvent.click(screen.getByRole("button", { name: "Select first dashboard row" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.rowSelectionModel).toEqual({ type: "include", ids: new Set(["project-1"]) });
    });

    fireEvent.click(screen.getByRole("button", { name: "Open first dashboard project row" }));
    expect(mockState.push).toHaveBeenCalledWith("/projects/project-1");
  });

  it("passes sorted and paginated rows to DataGridTable after dashboard table interactions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/projects") {
          return {
            ok: true,
            json: async () => ({
              projects: [
                {
                  id: "project-z",
                  name: "Zephyr",
                  industry: "Industrial",
                  revenue_min: 4,
                  revenue_max: 8,
                  ebitda_min: 1,
                  ebitda_max: 2,
                  location: "WA",
                  keywords: [],
                  created_at: "2026-01-03T00:00:00.000Z",
                },
                {
                  id: "project-a",
                  name: "Atlas",
                  industry: "Healthcare",
                  revenue_min: 1,
                  revenue_max: 2,
                  ebitda_min: 0.5,
                  ebitda_max: 1,
                  location: "CA",
                  keywords: [],
                  created_at: "2026-01-01T00:00:00.000Z",
                },
                {
                  id: "project-o",
                  name: "Orion",
                  industry: "Technology",
                  revenue_min: 2,
                  revenue_max: 6,
                  ebitda_min: 1,
                  ebitda_max: 3,
                  location: "TX",
                  keywords: [],
                  created_at: "2026-01-02T00:00:00.000Z",
                },
              ],
            }),
          };
        }

        if (url === "/api/buyer/analytics") {
          return {
            ok: true,
            json: async () => ({
              analytics: {
                pursuing: 1,
                passed: 0,
                ndaSigned: 0,
                ioisSubmitted: 0,
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

    render(<BuyerDashboard />);

    expect(await screen.findByTestId("buyer-projects-data-grid")).toBeInTheDocument();

    expect(getLatestGridProps()?.sortedCount).toBe(3);
    expect(getLatestGridProps()?.rows.map((row) => row.id)).toEqual(["project-z", "project-a", "project-o"]);

    fireEvent.click(screen.getByRole("button", { name: "Sort dashboard rows by name ascending" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.rows.map((row) => row.id)).toEqual(["project-a", "project-o", "project-z"]);
      expect(getLatestGridProps()?.sortedCount).toBe(3);
    });

    fireEvent.click(screen.getByRole("button", { name: "Dashboard set rows per page to 1" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 1 });
      expect(getLatestGridProps()?.rows.map((row) => row.id)).toEqual(["project-a"]);
    });

    fireEvent.click(screen.getByRole("button", { name: "Dashboard go to page 2" }));
    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 1, pageSize: 1 });
      expect(getLatestGridProps()?.rows.map((row) => row.id)).toEqual(["project-o"]);
    });
  });

  it("defines revenue, EBITDA, and created column formatters with graceful fallbacks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/projects") {
          return {
            ok: true,
            json: async () => ({
              projects: [
                {
                  id: "project-1",
                  name: "Project Orion",
                  industry: "Industrial",
                  revenue_min: 2,
                  revenue_max: 6,
                  ebitda_min: 1,
                  ebitda_max: 2,
                  location: "TX",
                  keywords: ["manufacturing"],
                  created_at: "2026-01-01T00:00:00.000Z",
                },
              ],
            }),
          };
        }

        if (url === "/api/buyer/analytics") {
          return {
            ok: true,
            json: async () => ({
              analytics: {
                pursuing: 1,
                passed: 0,
                ndaSigned: 0,
                ioisSubmitted: 0,
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

    render(<BuyerDashboard />);
    await screen.findByTestId("buyer-projects-data-grid");

    type DashboardColumn = {
      field?: string;
      renderCell?: (params: { row: Record<string, unknown> }) => string;
    };

    const columns = (getLatestGridProps()?.detailColumns ?? []) as DashboardColumn[];
    const revenueColumn = columns.find((column) => column.field === "revenue");
    const ebitdaColumn = columns.find((column) => column.field === "ebitda");
    const createdColumn = columns.find((column) => column.field === "created_at");

    expect(revenueColumn?.renderCell?.({ row: { revenue_min: 2, revenue_max: 6 } })).toBe("$2M – $6M");
    expect(revenueColumn?.renderCell?.({ row: { revenue_min: null, revenue_max: null } })).toBe("—");

    expect(ebitdaColumn?.renderCell?.({ row: { ebitda_min: null, ebitda_max: 3 } })).toBe("Any – $3M");
    expect(ebitdaColumn?.renderCell?.({ row: { ebitda_min: null, ebitda_max: null } })).toBe("—");

    expect(createdColumn?.renderCell?.({ row: { created_at: "2026-01-15T12:00:00.000Z" } })).toBe("01/15/2026");
    expect(createdColumn?.renderCell?.({ row: { created_at: "not-a-date" } })).toBe("—");
    expect(createdColumn?.renderCell?.({ row: { created_at: null } })).toBe("—");
  });
});
