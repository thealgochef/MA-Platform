import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@mui/x-data-grid", () => {
  const DataGrid = ({ rows, columns, onSortModelChange, onRowClick }: Record<string, unknown>) => (
    <div data-testid="integration-detail-grid">
      <div>
        {(columns as Array<{ field: string; headerName?: string }>).map((column) => (
          <button
            key={column.field}
            role="columnheader"
            type="button"
            onClick={() =>
              (onSortModelChange as ((model: Array<{ field: string; sort: "asc" | "desc" }>) => void) | undefined)?.([
                { field: column.field, sort: "asc" },
              ])
            }
          >
            {column.headerName || column.field}
          </button>
        ))}
      </div>

      {(rows as Array<{ id: string; project_name: string }>).map((row) => (
        <button
          key={row.id}
          data-testid={`row-${row.id}`}
          type="button"
          onClick={() =>
            (onRowClick as ((params: { row: { id: string; project_name: string } }) => void) | undefined)?.({ row })
          }
        >
          {row.project_name}
        </button>
      ))}
    </div>
  );

  return { DataGrid };
});

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");

  const TablePagination = ({ page, onPageChange, rowsPerPage, onRowsPerPageChange }: Record<string, unknown>) => (
    <div>
      <button
        type="button"
        onClick={() => (onPageChange as ((event: unknown, page: number) => void) | undefined)?.({}, (page as number) + 1)}
      >
        Next page
      </button>
      <select
        aria-label="Rows per page"
        value={rowsPerPage as number}
        onChange={(event) =>
          (onRowsPerPageChange as ((event: React.ChangeEvent<HTMLSelectElement>) => void) | undefined)?.(event)
        }
      >
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
      </select>
    </div>
  );

  return {
    ...actual,
    TablePagination,
  };
});

import DealsPage from "./page";

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

function buildDeal(id: number, project_name: string): DealRow {
  return {
    id: `deal-${id}`,
    project_name,
    headline: `${project_name} target`,
    status: "accepting_iois",
    industry: "Industrial",
    view_count: id,
    published_at: `2026-01-${String(id).padStart(2, "0")}T00:00:00.000Z`,
    revenue_year_3: null,
    ebitda_year_3: null,
  };
}

describe("DealsPage integration with real DataGridTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wires sorting, pagination, rows-per-page, and row navigation through DataGridTable", async () => {
    const deals: DealRow[] = [
      buildDeal(1, "Project Zulu"),
      buildDeal(2, "Project Alpha"),
      buildDeal(3, "Project Mike"),
      buildDeal(4, "Project Bravo"),
      buildDeal(5, "Project Echo"),
      buildDeal(6, "Project Charlie"),
      buildDeal(7, "Project Delta"),
      buildDeal(8, "Project Foxtrot"),
      buildDeal(9, "Project Golf"),
      buildDeal(10, "Project Hotel"),
      buildDeal(11, "Project India"),
      buildDeal(12, "Project Juliet"),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ deals }),
      }))
    );

    render(<DealsPage />);

    expect(await screen.findByTestId("integration-detail-grid")).toBeInTheDocument();

    expect(screen.getByTestId("row-deal-1")).toHaveTextContent("Project Zulu");
    expect(screen.getByTestId("row-deal-10")).toHaveTextContent("Project Hotel");
    expect(screen.queryByTestId("row-deal-11")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(screen.getByTestId("row-deal-11")).toHaveTextContent("Project India");
      expect(screen.getByTestId("row-deal-12")).toHaveTextContent("Project Juliet");
    });

    fireEvent.click(screen.getByRole("columnheader", { name: "Project Name" }));

    await waitFor(() => {
      expect(screen.getByTestId("row-deal-2")).toHaveTextContent("Project Alpha");
      expect(screen.getByTestId("row-deal-4")).toHaveTextContent("Project Bravo");
      expect(screen.queryByTestId("row-deal-1")).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "25" } });

    await waitFor(() => {
      expect(screen.getByTestId("row-deal-1")).toHaveTextContent("Project Zulu");
      expect(screen.getByTestId("row-deal-12")).toHaveTextContent("Project Juliet");
    });

    fireEvent.click(screen.getByTestId("row-deal-2"));

    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-2");
  });
});
