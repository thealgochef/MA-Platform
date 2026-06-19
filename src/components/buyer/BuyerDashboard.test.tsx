import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
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

type ProjectStatusChipProps = {
  isActive: boolean | null | undefined;
  clickable?: boolean;
  onClick?: (event: unknown) => void;
};

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
  capturedDataGridProps: [] as MockDashboardDataGridProps[],
  capturedStatusChipProps: [] as ProjectStatusChipProps[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@mui/material", () => ({
  Menu: ({ open, children }: { open?: boolean; children: ReactNode }) => (
    open ? <div data-testid="status-menu">{children}</div> : null
  ),
  MenuItem: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/ProjectStatusChip", () => ({
  getProjectStatusLabel: (isActive: boolean | null | undefined) => {
    if (isActive === true) {
      return "Active";
    }

    if (isActive === false) {
      return "Inactive";
    }

    return "—";
  },
  ProjectStatusChip: ({ isActive, clickable = false, onClick }: ProjectStatusChipProps) => {
    mockState.capturedStatusChipProps.push({ isActive, clickable, onClick });
    const label = isActive === true ? "Active" : isActive === false ? "Inactive" : "—";
    return (
      <button type="button" data-testid="buyer-status-chip" onClick={onClick}>
        {label}
      </button>
    );
  },
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
        <button type="button" onClick={() => props.onSortModelChange([{ field: "status", sort: "asc" }])}>
          Sort dashboard rows by status ascending
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

function getStatusColumn() {
  const latestGridProps = getLatestGridProps();
  return latestGridProps?.detailColumns.find((column) => column.field === "status") as
    | {
        valueGetter?: (_value: unknown, row: Record<string, unknown>) => unknown;
        renderCell?: (params: { row: Record<string, unknown> }) => unknown;
      }
    | undefined;
}

describe("BuyerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.capturedDataGridProps = [];
    mockState.capturedStatusChipProps = [];

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

  it("renders recent activity entries with deal labels and falls back to non-identifying confidential label", async () => {
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
          return {
            ok: true,
            json: async () => ({
              analytics: {
                pursuing: 1,
                passed: 0,
                ndaSigned: 1,
                ioisSubmitted: 0,
                loisSubmitted: 0,
                dealsByStage: {},
                avgRevenue: null,
                avgEbitda: null,
                avgMatchedRevenue: null,
                avgMatchedEbitda: null,
                dealsByIndustry: {},
              },
              activity: [
                {
                  id: "act-1",
                  action: "nda_signed",
                  deal_id: "deal-1234567890",
                  deal_label: "Alpha Tools",
                  created_at: "2026-01-10T00:00:00.000Z",
                  details: null,
                },
                {
                  id: "act-2",
                  action: "pursued",
                  deal_id: "abc12345-def0-9876",
                  deal_label: "   ",
                  created_at: "2026-01-09T00:00:00.000Z",
                  details: null,
                },
              ],
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

    expect(await screen.findByText("Recent Activity")).toBeInTheDocument();

    const recentActivityCard = screen.getByText("Recent Activity").closest("div");
    expect(recentActivityCard).not.toBeNull();
    expect(recentActivityCard).toHaveTextContent(/NDA signed\s+-\s+Alpha Tools/);
    expect(recentActivityCard).toHaveTextContent(/Pursued\s+-\s+Confidential Deal/);
    expect(recentActivityCard).not.toHaveTextContent("abc12345");
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
      "status",
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

    const columnFields = latestGridProps?.detailColumns.map((column) => column.field) ?? [];
    const projectNameColumnIndex = columnFields.indexOf("name");
    expect(projectNameColumnIndex).toBeGreaterThanOrEqual(0);
    expect(columnFields[projectNameColumnIndex + 1]).toBe("status");

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

  it("maps status values to reusable chips and sorts by status label ascending without requiring status mutation", async () => {
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
                  id: "project-inactive",
                  name: "Project Inactive",
                  is_active: false,
                  industry: "Industrial",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "TX",
                  keywords: [],
                  created_at: "2026-01-03T00:00:00.000Z",
                },
                {
                  id: "project-active",
                  name: "Project Active",
                  is_active: true,
                  industry: "Healthcare",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "CA",
                  keywords: [],
                  created_at: "2026-01-02T00:00:00.000Z",
                },
                {
                  id: "project-fallback",
                  name: "Project Fallback",
                  is_active: null,
                  industry: "Technology",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "WA",
                  keywords: [],
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

    expect(await screen.findByTestId("buyer-projects-data-grid")).toBeInTheDocument();

    const statusColumn = getStatusColumn();

    expect(statusColumn?.valueGetter).toBeTypeOf("function");
    expect(statusColumn?.renderCell).toBeTypeOf("function");
    expect(statusColumn?.valueGetter?.(undefined, { is_active: true })).toBe("Active");
    expect(statusColumn?.valueGetter?.(undefined, { is_active: false })).toBe("Inactive");
    expect(statusColumn?.valueGetter?.(undefined, { is_active: null })).toBe("—");

    render(
      <>
        {statusColumn?.renderCell?.({ row: { id: "project-active", is_active: true } })}
        {statusColumn?.renderCell?.({ row: { id: "project-inactive", is_active: false } })}
        {statusColumn?.renderCell?.({ row: { id: "project-fallback", is_active: null } })}
      </>
    );

    const statusChipNodes = screen.getAllByTestId("buyer-status-chip");
    expect(statusChipNodes).toHaveLength(3);
    expect(statusChipNodes[0]).toHaveTextContent("Active");
    expect(statusChipNodes[1]).toHaveTextContent("Inactive");
    expect(statusChipNodes[2]).toHaveTextContent("—");
    expect(mockState.capturedStatusChipProps.slice(-3)).toEqual([
      { isActive: true, clickable: true, onClick: expect.any(Function) },
      { isActive: false, clickable: true, onClick: expect.any(Function) },
      { isActive: null, clickable: true, onClick: expect.any(Function) },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Sort dashboard rows by status ascending" }));

    await waitFor(() => {
      expect(getLatestGridProps()?.sortModel).toEqual([{ field: "status", sort: "asc" }]);
      expect(getLatestGridProps()?.rows.map((row) => row.id)).toEqual([
        "project-fallback",
        "project-active",
        "project-inactive",
      ]);
    });
  });

  it("navigates to the project edit page when Edit Project is selected from the status menu", async () => {
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
                  id: "project-edit",
                  name: "Project Edit",
                  is_active: true,
                  industry: "Industrial",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "TX",
                  keywords: [],
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

    expect(await screen.findByTestId("buyer-projects-data-grid")).toBeInTheDocument();

    const statusColumn = getStatusColumn();
    render(<>{statusColumn?.renderCell?.({ row: { id: "project-edit", is_active: true } })}</>);

    fireEvent.click(screen.getByTestId("buyer-status-chip"));
    fireEvent.click(screen.getByRole("button", { name: "Edit Project" }));

    expect(mockState.push).toHaveBeenCalledWith("/projects/project-edit/edit");
  });

  it("shows Resume Project for inactive status and resumes with an active PATCH payload", async () => {
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
                  id: "project-inactive",
                  name: "Project Inactive",
                  is_active: false,
                  industry: "Industrial",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "TX",
                  keywords: [],
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

        if (url === "/api/projects/project-inactive/status") {
          return {
            ok: true,
            json: async () => ({ project: { id: "project-inactive", is_active: true } }),
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

    const statusColumn = getStatusColumn();
    render(<>{statusColumn?.renderCell?.({ row: { id: "project-inactive", is_active: false } })}</>);

    fireEvent.click(screen.getByTestId("buyer-status-chip"));

    expect(screen.getByRole("button", { name: "Resume Project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause Project" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume Project" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/projects/project-inactive/status",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
        })
      );
    });
  });

  it("shows a failure error when project status PATCH returns non-OK", async () => {
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
                  id: "project-active",
                  name: "Project Active",
                  is_active: true,
                  industry: "Industrial",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "TX",
                  keywords: [],
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

        if (url === "/api/projects/project-active/status") {
          return {
            ok: false,
            json: async () => ({}),
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

    const statusColumn = getStatusColumn();
    render(<>{statusColumn?.renderCell?.({ row: { id: "project-active", is_active: true } })}</>);

    fireEvent.click(screen.getByTestId("buyer-status-chip"));
    fireEvent.click(screen.getByRole("button", { name: "Pause Project" }));

    expect(await screen.findByText("Failed to update project status.")).toBeInTheDocument();
  });

  it("shows a network error when project status PATCH rejects", async () => {
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
                  id: "project-active",
                  name: "Project Active",
                  is_active: true,
                  industry: "Industrial",
                  revenue_min: null,
                  revenue_max: null,
                  ebitda_min: null,
                  ebitda_max: null,
                  location: "TX",
                  keywords: [],
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

        if (url === "/api/projects/project-active/status") {
          throw new Error("network down");
        }

        return {
          ok: false,
          json: async () => ({}),
        };
      })
    );

    render(<BuyerDashboard />);

    expect(await screen.findByTestId("buyer-projects-data-grid")).toBeInTheDocument();

    const statusColumn = getStatusColumn();
    render(<>{statusColumn?.renderCell?.({ row: { id: "project-active", is_active: true } })}</>);

    fireEvent.click(screen.getByTestId("buyer-status-chip"));
    fireEvent.click(screen.getByRole("button", { name: "Pause Project" }));

    expect(await screen.findByText("Network error. Please try again.")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
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
