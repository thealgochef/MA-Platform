import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type DealRow = {
  id: string;
  project_name: string;
  headline: string;
  status: string;
  industry: string;
  view_count: number;
  published_at: string | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
};

type TestSortModel = Array<{ field: string; sort?: "asc" | "desc" | null }>;
type GridColumnContract = { field: string };

type MockDataGridProps = {
  rows: DealRow[];
  detailColumns: GridColumnContract[];
  onRowClick: (row: DealRow) => void;
  sortedCount: number;
  sortModel: TestSortModel;
  onSortModelChange: (sortModel: TestSortModel) => void;
  paginationModel: { page: number; pageSize: number };
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (pageSize: number) => void;
  rowSelectionModel: unknown;
  onRowSelectionModelChange: (model: unknown) => void;
};

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
  capturedDataGridProps: [] as MockDataGridProps[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@/components/ui/DataGridTable", () => ({
  DataGridTable: (props: MockDataGridProps) => {
    const requiredProps: Array<keyof MockDataGridProps> = [
      "rows",
      "detailColumns",
      "onRowClick",
      "sortedCount",
      "sortModel",
      "onSortModelChange",
      "paginationModel",
      "onPageChange",
      "onRowsPerPageChange",
      "rowSelectionModel",
      "onRowSelectionModelChange",
    ];

    for (const propName of requiredProps) {
      if (props[propName] === undefined) {
        throw new Error(`Missing required DataGridTable prop: ${propName}`);
      }
    }

    mockState.capturedDataGridProps.push(props);

    return (
      <div data-testid="broker-data-grid">
        <p data-testid="grid-row-count">Rows: {props.rows.length}</p>
        <p data-testid="grid-row-project-names">{props.rows.map((row) => row.project_name).join(",")}</p>
        <button type="button" onClick={() => props.onSortModelChange([{ field: "project_name", sort: "asc" }])}>
          Sort by project name ascending
        </button>
        <button type="button" onClick={() => props.onPageChange(1)}>
          Go to page 2
        </button>
        <button type="button" onClick={() => props.onRowsPerPageChange(25)}>
          Set rows per page to 25
        </button>
        <button
          type="button"
          onClick={() =>
            props.onRowSelectionModelChange({
              type: "include",
              ids: new Set(props.rows[0] ? [props.rows[0].id] : []),
            })
          }
        >
          Select first row
        </button>
        <button type="button" onClick={() => props.onRowClick(props.rows[0])} disabled={props.rows.length === 0}>
          Open first deal row
        </button>
      </div>
    );
  },
}));

import BrokerDashboard from "./BrokerDashboard";

function mockDealsResponse(deals: Array<Record<string, unknown>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ deals }),
    }))
  );
}

function getLatestGridProps() {
  return mockState.capturedDataGridProps.at(-1);
}

describe("BrokerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.capturedDataGridProps = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state before deals request resolves", async () => {
    let resolveFetch!: (value: { ok: boolean; json: () => Promise<{ deals: [] }> }) => void;
    const deferredFetch = new Promise<{ ok: boolean; json: () => Promise<{ deals: [] }> }>((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal("fetch", vi.fn(() => deferredFetch));

    render(<BrokerDashboard />);

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: async () => ({ deals: [] }),
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading dashboard...")).not.toBeInTheDocument();
    });
  });

  it("renders empty state CTA when no deals are returned", async () => {
    mockDealsResponse([]);

    render(<BrokerDashboard />);

    expect(await screen.findByText("Post your first deal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Deal" })).toHaveAttribute("href", "/deals/new");
    expect(screen.queryByTestId("broker-data-grid")).not.toBeInTheDocument();
  });

  it("renders DataGridTable with deals and navigates to deal detail on row click", async () => {
    const deals: DealRow[] = [
      {
        id: "deal-1",
        project_name: "Project Orion",
        headline: "Industrial carve-out",
        status: "accepting_iois",
        industry: "Industrial",
        view_count: 10,
        published_at: "2026-01-01T00:00:00.000Z",
        revenue_year_3: 1000000,
        ebitda_year_3: 100000,
      },
      {
        id: "deal-2",
        project_name: "Project Atlas",
        headline: "Healthcare roll-up",
        status: "accepting_lois",
        industry: "Healthcare",
        view_count: 20,
        published_at: "2026-01-02T00:00:00.000Z",
        revenue_year_3: 2000000,
        ebitda_year_3: 300000,
      },
    ];

    mockDealsResponse(deals);

    render(<BrokerDashboard />);

    expect(await screen.findByTestId("broker-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-count")).toHaveTextContent("Rows: 2");
    expect(fetch).toHaveBeenCalledWith("/api/deals", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    const latestGridProps = getLatestGridProps();
    const detailColumnFields = latestGridProps?.detailColumns.map((column) => column.field) ?? [];
    expect(latestGridProps?.rows).toEqual(deals);
    expect(detailColumnFields).toEqual(
      expect.arrayContaining(["project_name", "headline", "industry", "revenue", "status", "view_count"])
    );
    expect(latestGridProps?.sortedCount).toBe(deals.length);
    expect(latestGridProps?.sortModel).toEqual([]);
    expect(latestGridProps?.paginationModel).toEqual({ page: 0, pageSize: 10 });
    expect(latestGridProps?.rowSelectionModel).toEqual({ type: "include", ids: new Set() });
    expect(latestGridProps?.onRowClick).toBeTypeOf("function");
    expect(latestGridProps?.onSortModelChange).toBeTypeOf("function");
    expect(latestGridProps?.onPageChange).toBeTypeOf("function");
    expect(latestGridProps?.onRowsPerPageChange).toBeTypeOf("function");
    expect(latestGridProps?.onRowSelectionModelChange).toBeTypeOf("function");

    fireEvent.click(screen.getByRole("button", { name: "Select first row" }));

    await waitFor(() => {
      const updatedGridProps = getLatestGridProps();
      expect(updatedGridProps?.rowSelectionModel).toEqual({ type: "include", ids: new Set(["deal-1"]) });
    });

    fireEvent.click(screen.getByRole("button", { name: "Open first deal row" }));

    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-1");
  });

  it("integrates sorting and pagination callbacks with rendered rows and counts", async () => {
    const projectNames = [
      "Project Zulu",
      "Project Alpha",
      "Project Mike",
      "Project Bravo",
      "Project Echo",
      "Project Charlie",
      "Project Delta",
      "Project Foxtrot",
      "Project Golf",
      "Project Hotel",
      "Project India",
      "Project Juliet",
    ];

    const deals: DealRow[] = projectNames.map((project_name, index) => ({
      id: `deal-${index + 1}`,
      project_name,
      headline: `${project_name} target`,
      status: index % 3 === 0 ? "accepting_iois" : index % 3 === 1 ? "accepting_lois" : "draft",
      industry: index % 2 === 0 ? "Industrial" : "Tech",
      view_count: index + 1,
      published_at: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      revenue_year_3: null,
      ebitda_year_3: null,
    }));

    mockDealsResponse(deals);

    render(<BrokerDashboard />);

    expect(await screen.findByTestId("broker-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-project-names")).toHaveTextContent(
      "Project Zulu,Project Alpha,Project Mike,Project Bravo,Project Echo,Project Charlie,Project Delta,Project Foxtrot,Project Golf,Project Hotel"
    );
    expect(getLatestGridProps()?.sortedCount).toBe(deals.length);
    expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 10 });

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-project-names")).toHaveTextContent("Project India,Project Juliet");
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 1, pageSize: 10 });
      expect(getLatestGridProps()?.sortedCount).toBe(deals.length);
    });

    fireEvent.click(screen.getByRole("button", { name: "Sort by project name ascending" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-project-names")).toHaveTextContent(
        "Project Alpha,Project Bravo,Project Charlie,Project Delta,Project Echo,Project Foxtrot,Project Golf,Project Hotel,Project India,Project Juliet"
      );
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 10 });
      expect(getLatestGridProps()?.sortedCount).toBe(deals.length);
    });

    fireEvent.click(screen.getByRole("button", { name: "Set rows per page to 25" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-project-names")).toHaveTextContent(
        "Project Alpha,Project Bravo,Project Charlie,Project Delta,Project Echo,Project Foxtrot,Project Golf,Project Hotel,Project India,Project Juliet,Project Mike,Project Zulu"
      );
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 25 });
      expect(getLatestGridProps()?.sortedCount).toBe(deals.length);
    });
  });
});
