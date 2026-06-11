import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EngagementTableRow = {
  id: string;
  deal_id: string;
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          engagements: [
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
          ],
        }),
      }))
    );

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
          last_updated: "not-a-date",
        },
      })
    );
    expect(renderedLastUpdated).toBe("—");

    latestGridProps?.onRowClick({
      id: "eng-1",
      deal_id: "deal/abc?x=1",
      last_updated: "not-a-date",
    });

    await waitFor(() => {
      expect(mockState.push).toHaveBeenCalledWith("/deals/deal%2Fabc%3Fx%3D1");
    });
  });
});
