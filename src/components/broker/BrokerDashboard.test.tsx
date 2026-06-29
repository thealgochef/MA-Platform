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
  has_pending_actions?: boolean;
  pending_action_type?: "release_nda" | "release_cim" | null;
};

type TestSortModel = Array<{ field: string; sort?: "asc" | "desc" | null }>;
type GridColumnContract = { field: string };

type MockDataGridProps = {
  rows: Array<Record<string, unknown>>;
  detailColumns: GridColumnContract[];
  onRowClick: (row: Record<string, unknown>) => void;
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

    const gridKind = props.detailColumns.some((column) => column.field === "industry") ? "deals" : "pending";

    return (
      <div data-testid={`broker-data-grid-${gridKind}`}>
        <p data-testid={`grid-row-count-${gridKind}`}>Rows: {props.rows.length}</p>
        <p data-testid={`grid-row-project-names-${gridKind}`}>
          {props.rows.map((row) => String(row.project_name ?? "")).join(",")}
        </p>
        <p data-testid={`grid-row-actions-${gridKind}`}>
          {props.rows.map((row) => String(row.action ?? "")).join(",")}
        </p>
        <button type="button" onClick={() => props.onSortModelChange([{ field: "project_name", sort: "asc" }])}>
          Sort by project name ascending ({gridKind})
        </button>
        <button type="button" onClick={() => props.onPageChange(1)}>
          Go to page 2 ({gridKind})
        </button>
        <button type="button" onClick={() => props.onRowsPerPageChange(25)}>
          Set rows per page to 25 ({gridKind})
        </button>
        <button
          type="button"
          onClick={() =>
            props.onRowSelectionModelChange({
              type: "include",
              ids: new Set(props.rows[0]?.id ? [String(props.rows[0].id)] : []),
            })
          }
        >
          Select first row ({gridKind})
        </button>
        <button
          type="button"
          onClick={() => props.rows[0] && props.onRowClick(props.rows[0])}
          disabled={props.rows.length === 0}
        >
          Open first deal row ({gridKind})
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

function getLatestDealsGridProps() {
  return [...mockState.capturedDataGridProps]
    .reverse()
    .find((props) => props.detailColumns.some((column) => column.field === "industry"));
}

function getLatestPendingGridProps() {
  return [...mockState.capturedDataGridProps]
    .reverse()
    .find((props) => !props.detailColumns.some((column) => column.field === "industry"));
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
    expect(screen.queryByTestId("broker-data-grid-deals")).not.toBeInTheDocument();
    expect(screen.getByTestId("broker-data-grid-pending")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-count-pending")).toHaveTextContent("Rows: 0");
  });

  it("renders each analytics summary card as a deals link with interactive card styling", async () => {
    const deals: DealRow[] = [
      {
        id: "deal-1",
        project_name: "Project Orion",
        headline: "Industrial carve-out",
        status: "closed",
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
        status: "draft",
        industry: "Healthcare",
        view_count: 20,
        published_at: "2026-01-02T00:00:00.000Z",
        revenue_year_3: 2000000,
        ebitda_year_3: 300000,
      },
    ];

    mockDealsResponse(deals);

    render(<BrokerDashboard />);

    await screen.findByTestId("broker-data-grid-deals");

    const totalDealsLink = screen.getByRole("link", { name: /Total Deals/i });
    const activeDealsLink = screen.getByRole("link", { name: /Active Deals/i });
    const draftsLink = screen.getByRole("link", { name: /Drafts/i });
    const closedLink = screen.getByRole("link", { name: /Closed/i });

    expect(totalDealsLink).toHaveAttribute("href", "/deals");
    expect(activeDealsLink).toHaveAttribute("href", "/deals");
    expect(draftsLink).toHaveAttribute("href", "/deals?status=draft");
    expect(closedLink).toHaveAttribute("href", "/deals");

    const summaryLinks = [totalDealsLink, activeDealsLink, draftsLink, closedLink];
    for (const link of summaryLinks) {
      expect(link).toHaveClass("transition-shadow", "hover:shadow-md", "focus-visible:ring-2", "focus-visible:ring-primary");
    }
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

    expect(await screen.findByTestId("broker-data-grid-deals")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-count-deals")).toHaveTextContent("Rows: 2");
    expect(fetch).toHaveBeenCalledWith("/api/deals", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    const latestGridProps = getLatestDealsGridProps();
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

    fireEvent.click(screen.getByRole("button", { name: "Select first row (deals)" }));

    await waitFor(() => {
      const updatedGridProps = getLatestDealsGridProps();
      expect(updatedGridProps?.rowSelectionModel).toEqual({ type: "include", ids: new Set(["deal-1"]) });
    });

    fireEvent.click(screen.getByRole("button", { name: "Open first deal row (deals)" }));

    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-1");

    const pendingGridProps = getLatestPendingGridProps();
    const pendingFields = pendingGridProps?.detailColumns.map((column) => column.field) ?? [];
    expect(pendingFields).toEqual(expect.arrayContaining(["project_name", "headline", "action"]));
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

    expect(await screen.findByTestId("broker-data-grid-deals")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-project-names-deals")).toHaveTextContent(
      "Project Zulu,Project Alpha,Project Mike,Project Bravo,Project Echo,Project Charlie,Project Delta,Project Foxtrot,Project Golf,Project Hotel"
    );
    expect(getLatestDealsGridProps()?.sortedCount).toBe(deals.length);
    expect(getLatestDealsGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 10 });

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2 (deals)" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-project-names-deals")).toHaveTextContent("Project India,Project Juliet");
      expect(getLatestDealsGridProps()?.paginationModel).toEqual({ page: 1, pageSize: 10 });
      expect(getLatestDealsGridProps()?.sortedCount).toBe(deals.length);
    });

    fireEvent.click(screen.getByRole("button", { name: "Sort by project name ascending (deals)" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-project-names-deals")).toHaveTextContent(
        "Project Alpha,Project Bravo,Project Charlie,Project Delta,Project Echo,Project Foxtrot,Project Golf,Project Hotel,Project India,Project Juliet"
      );
      expect(getLatestDealsGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 10 });
      expect(getLatestDealsGridProps()?.sortedCount).toBe(deals.length);
    });

    fireEvent.click(screen.getByRole("button", { name: "Set rows per page to 25 (deals)" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-project-names-deals")).toHaveTextContent(
        "Project Alpha,Project Bravo,Project Charlie,Project Delta,Project Echo,Project Foxtrot,Project Golf,Project Hotel,Project India,Project Juliet,Project Mike,Project Zulu"
      );
      expect(getLatestDealsGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 25 });
      expect(getLatestDealsGridProps()?.sortedCount).toBe(deals.length);
    });
  });

  it("shows pending actions when either manual vetting rule matches and includes each project once", async () => {
    const deals = [
      {
        id: "deal-1",
        project_name: "Project NDA Manual",
        headline: "Needs NDA approval",
        status: "accepting_iois",
        industry: "Industrial",
        view_count: 1,
        published_at: "2026-01-01T00:00:00.000Z",
        revenue_year_3: null,
        ebitda_year_3: null,
        has_pending_actions: true,
        pending_action_type: "release_nda",
      },
      {
        id: "deal-2",
        project_name: "Project CIM Manual",
        headline: "Needs CIM release",
        status: "accepting_iois",
        industry: "Healthcare",
        view_count: 2,
        published_at: "2026-01-02T00:00:00.000Z",
        revenue_year_3: null,
        ebitda_year_3: null,
        has_pending_actions: true,
        pending_action_type: "release_cim",
      },
      {
        id: "deal-3",
        project_name: "Project Both Manual",
        headline: "Qualifies both ways",
        status: "accepting_iois",
        industry: "Tech",
        view_count: 3,
        published_at: "2026-01-03T00:00:00.000Z",
        revenue_year_3: null,
        ebitda_year_3: null,
        has_pending_actions: true,
        pending_action_type: "release_nda",
      },
      {
        id: "deal-4",
        project_name: "Project Not Pending",
        headline: "No pending action",
        status: "accepting_iois",
        industry: "Services",
        view_count: 4,
        published_at: "2026-01-04T00:00:00.000Z",
        revenue_year_3: null,
        ebitda_year_3: null,
        has_pending_actions: false,
        pending_action_type: null,
      },
      {
        id: "deal-5",
        project_name: "Project NDA Manual But Signed",
        headline: "Signed NDA does not require manual NDA vetting",
        status: "accepting_iois",
        industry: "Industrial",
        view_count: 5,
        published_at: "2026-01-05T00:00:00.000Z",
        revenue_year_3: null,
        ebitda_year_3: null,
        has_pending_actions: false,
        pending_action_type: null,
      },
      {
        id: "deal-6",
        project_name: "Project CIM Manual But Pending",
        headline: "Pending NDA does not require manual CIM release",
        status: "accepting_iois",
        industry: "Industrial",
        view_count: 6,
        published_at: "2026-01-06T00:00:00.000Z",
        revenue_year_3: null,
        ebitda_year_3: null,
        has_pending_actions: false,
        pending_action_type: null,
      },
    ];

    mockDealsResponse(deals);

    render(<BrokerDashboard />);

    expect(await screen.findByTestId("broker-data-grid-pending")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-count-pending")).toHaveTextContent("Rows: 3");
    expect(screen.getByTestId("grid-row-project-names-pending")).toHaveTextContent(
      "Project NDA Manual,Project CIM Manual,Project Both Manual"
    );
    expect(screen.getByTestId("grid-row-actions-pending")).toHaveTextContent(
      "Release NDA,Release CIM,Release NDA"
    );

    const pendingRows = getLatestPendingGridProps()?.rows ?? [];
    const pendingRowIds = pendingRows.map((row) => String(row.id));
    expect(new Set(pendingRowIds).size).toBe(pendingRowIds.length);

    fireEvent.click(screen.getByRole("button", { name: "Open first deal row (pending)" }));

    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-1?tab=pipeline");
  });

  it.each([
    { label: "object", payload: {} },
    { label: "string", payload: "unexpected" },
  ])(
    "gracefully falls back to empty state when deals payload is malformed ($label)",
    async ({ payload }) => {
      mockDealsResponse(payload as Array<Record<string, unknown>>);

      render(<BrokerDashboard />);

      expect(await screen.findByTestId("broker-data-grid-pending")).toBeInTheDocument();
      expect(screen.getByTestId("grid-row-count-pending")).toHaveTextContent("Rows: 0");
      expect(screen.getByText("Post your first deal")).toBeInTheDocument();
      expect(screen.queryByText("Failed to load deals.")).not.toBeInTheDocument();
      expect(screen.queryByText("Network error. Please try again.")).not.toBeInTheDocument();
    }
  );
});
