import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EngagementTableRow = {
  id: string;
  deal_id: string;
  stage: string;
  last_updated: string;
};

type TestSortModel = Array<{ field: string; sort?: "asc" | "desc" | null }>;

type MockDataGridProps = {
  rows: EngagementTableRow[];
  detailColumns: Array<{ field?: string; renderCell?: (params: { row: EngagementTableRow }) => unknown }>;
  onRowClick: (row: EngagementTableRow) => void;
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
    mockState.capturedDataGridProps.push(props);
    return <div data-testid="engagements-data-grid" />;
  },
}));

import BuyerEngagementsPage from "./page";

function mockEngagementsResponse(engagements: Array<Record<string, unknown>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ engagements }),
    }))
  );
}

function createEngagement(index: number, stage: "nda_pending" | "pursued") {
  return {
    id: `eng-${index}`,
    stage,
    nda_status: stage === "nda_pending" ? "pending" : "signed",
    created_at: `2026-01-${String(index).padStart(2, "0")}T00:00:00.000Z`,
    updated_at: `2026-02-${String(index).padStart(2, "0")}T00:00:00.000Z`,
    project_id: `project-${index}`,
    project_name: `Project ${index}`,
    deal: {
      id: `deal-${index}`,
      headline: `Deal ${index}`,
      industry: "Tech",
      status: "accepting_iois",
      geography: null,
      geography_display: null,
      revenue_year_3: null,
      ebitda_year_3: null,
      published_at: null,
    },
  };
}

function getLatestGridProps() {
  return mockState.capturedDataGridProps.at(-1);
}

describe("BuyerEngagementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.capturedDataGridProps = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders em dash for invalid last_updated and encodes deal id on navigation", async () => {
    mockEngagementsResponse([
      {
        id: "eng-1",
        stage: "pursued",
        nda_status: "signed",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "not-a-date",
        project_id: "project-1",
        project_name: "Platform Build",
        deal: {
          id: "deal/abc?x=1",
          headline: "Alpha",
          industry: "Tech",
          status: "accepting_iois",
          geography: null,
          geography_display: null,
          revenue_year_3: null,
          ebitda_year_3: null,
          published_at: null,
        },
      },
    ]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    const latestGridProps = getLatestGridProps();
    const lastUpdatedColumn = latestGridProps?.detailColumns.find((column) => column.field === "last_updated");
    expect(lastUpdatedColumn?.renderCell).toBeTypeOf("function");

    const renderedLastUpdated = String(
      lastUpdatedColumn?.renderCell?.({
        row: {
          id: "eng-1",
          deal_id: "deal/abc?x=1",
          stage: "pursued",
          last_updated: "not-a-date",
        },
      })
    );
    expect(renderedLastUpdated).toBe("—");

    latestGridProps?.onRowClick({
      id: "eng-1",
      deal_id: "deal/abc?x=1",
      stage: "pursued",
      last_updated: "not-a-date",
    });

    await waitFor(() => {
      expect(mockState.push).toHaveBeenCalledWith("/deals/deal%2Fabc%3Fx%3D1");
    });
  });

  it("shows stage filter buttons for present stages with formatted labels and correct counts", async () => {
    mockEngagementsResponse([
      {
        id: "eng-1",
        stage: "nda_pending",
        nda_status: "pending",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-05T00:00:00.000Z",
        project_id: "project-1",
        project_name: "Platform Build",
        deal: {
          id: "deal-1",
          headline: "Alpha",
          industry: "Tech",
          status: "accepting_iois",
          geography: null,
          geography_display: null,
          revenue_year_3: null,
          ebitda_year_3: null,
          published_at: null,
        },
      },
      {
        id: "eng-2",
        stage: "pursued",
        nda_status: "signed",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-06T00:00:00.000Z",
        project_id: "project-2",
        project_name: "Growth",
        deal: {
          id: "deal-2",
          headline: "Beta",
          industry: "Healthcare",
          status: "accepting_iois",
          geography: null,
          geography_display: null,
          revenue_year_3: null,
          ebitda_year_3: null,
          published_at: null,
        },
      },
      {
        id: "eng-3",
        stage: "nda_pending",
        nda_status: "pending",
        created_at: "2026-01-03T00:00:00.000Z",
        updated_at: "2026-01-07T00:00:00.000Z",
        project_id: "project-3",
        project_name: "Scale",
        deal: {
          id: "deal-3",
          headline: "Gamma",
          industry: "Industrial",
          status: "accepting_iois",
          geography: null,
          geography_display: null,
          revenue_year_3: null,
          ebitda_year_3: null,
          published_at: null,
        },
      },
    ]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    expect(screen.getByRole("button", { name: "All (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NDA pending (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pursued (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Declined/i })).not.toBeInTheDocument();
  });

  it("filters DataGrid rows by stage, updates sortedCount, restores all rows, and resets pagination page", async () => {
    const engagements = Array.from({ length: 12 }, (_, i) =>
      createEngagement(i + 1, i % 2 === 0 ? "nda_pending" : "pursued")
    );

    mockEngagementsResponse(engagements);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.rows).toHaveLength(10);
      expect(latestGridProps?.sortedCount).toBe(12);
      expect(latestGridProps?.paginationModel.page).toBe(0);
    });

    act(() => {
      getLatestGridProps()?.onPageChange(1);
    });

    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel.page).toBe(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "NDA pending (6)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.rows).toHaveLength(6);
      expect(latestGridProps?.rows.every((row) => row.stage === "nda_pending")).toBe(true);
      expect(latestGridProps?.sortedCount).toBe(6);
      expect(latestGridProps?.paginationModel.page).toBe(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "All (12)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.rows).toHaveLength(10);
      expect(latestGridProps?.rows.some((row) => row.stage === "nda_pending")).toBe(true);
      expect(latestGridProps?.rows.some((row) => row.stage === "pursued")).toBe(true);
      expect(latestGridProps?.sortedCount).toBe(12);
      expect(latestGridProps?.paginationModel.page).toBe(0);
    });
  });

  it("resets pagination to first page when sort model changes", async () => {
    const engagements = Array.from({ length: 12 }, (_, i) =>
      createEngagement(i + 1, i % 2 === 0 ? "nda_pending" : "pursued")
    );

    mockEngagementsResponse(engagements);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    act(() => {
      getLatestGridProps()?.onPageChange(1);
    });

    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel.page).toBe(1);
    });

    act(() => {
      getLatestGridProps()?.onSortModelChange([{ field: "deal_headline", sort: "asc" }]);
    });

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.paginationModel.page).toBe(0);
      expect(latestGridProps?.sortModel).toEqual([{ field: "deal_headline", sort: "asc" }]);
    });
  });

  it("hides stage filter bar when there are no engagements", async () => {
    mockEngagementsResponse([]);

    render(<BuyerEngagementsPage />);

    await screen.findByText("You haven't engaged with any deals yet.");

    expect(screen.queryByRole("button", { name: /^All \(/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("engagements-data-grid")).not.toBeInTheDocument();
  });

  it("renders formatted filter label for unknown custom stage values", async () => {
    mockEngagementsResponse([
      {
        id: "eng-custom",
        stage: "custom_stage",
        nda_status: "signed",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        project_id: "project-custom",
        project_name: "Custom Project",
        deal: {
          id: "deal-custom",
          headline: "Custom Deal",
          industry: "Tech",
          status: "accepting_iois",
          geography: null,
          geography_display: null,
          revenue_year_3: null,
          ebitda_year_3: null,
          published_at: null,
        },
      },
    ]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    expect(screen.getByRole("button", { name: "All (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom stage (1)" })).toBeInTheDocument();
  });
});
