import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";
import { describe, expect, it, vi } from "vitest";

vi.mock("@mui/x-data-grid", () => {
  const DataGrid = ({
    rows,
    columns,
    getRowId,
    getRowClassName,
    onRowClick,
    onSortModelChange,
  }: Record<string, unknown>) => {
    const gridType = (columns as Array<{ field: string }>)[0]?.field === "headline" ? "headline" : "detail";

    return (
      <div data-testid={`${gridType}-grid`}>
        <div>
          {(columns as Array<{ field: string; headerName?: string }>).map((column) => (
            <button
              key={column.field}
              role="columnheader"
              tabIndex={-1}
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

        {(rows as Array<Record<string, unknown>>).map((row) => {
          const rowId = (getRowId as ((row: Record<string, unknown>) => string) | undefined)?.(row) ?? String(row.id);
          const className =
            (getRowClassName as ((params: { id: string; row: Record<string, unknown> }) => string) | undefined)?.({
              id: rowId,
              row,
            }) ?? "";
          const cellField = gridType === "headline" ? "headline" : "industry";

          return (
            <div
              key={`${gridType}-${rowId}`}
              role="row"
              data-id={rowId}
              data-testid={`row-${rowId}-${gridType}`}
              className={className}
              onClick={() =>
                (onRowClick as ((params: { id: string; row: Record<string, unknown> }) => void) | undefined)?.({
                  id: rowId,
                  row,
                })
              }
            >
              <button type="button" data-testid={`cell-${rowId}-${gridType}`} data-field={cellField}>
                {cellField}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return { DataGrid };
});

import { ProjectDealsTable } from "./ProjectDealsTable";

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");

  const TablePagination = ({ page, onPageChange, rowsPerPage, onRowsPerPageChange }: Record<string, unknown>) => (
    <div>
      <button
        type="button"
        onClick={() => (onPageChange as ((e: unknown, page: number) => void) | undefined)?.({}, (page as number) + 1)}
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

type TestDeal = {
  id: string;
  headline: string;
  industry: string;
  engagement: { stage: string } | null;
};

const rows: TestDeal[] = [
  {
    id: "deal-1",
    headline: "Alpha Corp",
    industry: "Technology",
    engagement: null,
  },
  {
    id: "deal-2",
    headline: "Beta Group",
    industry: "Healthcare",
    engagement: { stage: "declined" },
  },
];

const headlineColumn: GridColDef<TestDeal> = {
  field: "headline",
  headerName: "Headline",
};

const detailColumns: GridColDef<TestDeal>[] = [
  {
    field: "industry",
    headerName: "Industry",
  },
  {
    field: "actions",
    headerName: "Actions",
    sortable: false,
  },
];

const rowSelectionModel: GridRowSelectionModel = {
  type: "include",
  ids: new Set(),
};

const sortModel: GridSortModel = [];

const paginationModel: GridPaginationModel = {
  page: 0,
  pageSize: 10,
};

function renderTable(overrides: Partial<React.ComponentProps<typeof ProjectDealsTable<TestDeal>>> = {}) {
  const onRowSelectionModelChange = vi.fn();
  const onSortModelChange = vi.fn();
  const onRowClick = vi.fn();
  const onPageChange = vi.fn();
  const onRowsPerPageChange = vi.fn();

  render(
    <ProjectDealsTable
      rows={rows}
      headlineColumn={headlineColumn}
      detailColumns={detailColumns}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={onRowSelectionModelChange}
      sortModel={sortModel}
      onSortModelChange={onSortModelChange}
      onRowClick={onRowClick}
      sortedCount={rows.length}
      paginationModel={paginationModel}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      {...overrides}
    />
  );

  return {
    onSortModelChange,
    onRowClick,
    onPageChange,
    onRowsPerPageChange,
  };
}

describe("ProjectDealsTable", () => {
  it("makes all column headers tabbable", async () => {
    renderTable();

    await waitFor(() => {
      const headers = screen.getAllByRole("columnheader");
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((header) => {
        expect(header).toHaveAttribute("tabindex", "0");
      });
    });
  });

  it("calls onRowClick with row data", () => {
    const { onRowClick } = renderTable();

    fireEvent.click(screen.getByTestId("row-deal-1-headline"));

    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: "deal-1" }));
  });

  it("syncs hover class on row enter and clears on leave", () => {
    renderTable();

    const headlineRow = screen.getByTestId("row-deal-1-headline");
    const detailRow = screen.getByTestId("row-deal-1-detail");

    fireEvent.mouseOver(headlineRow, { relatedTarget: null });

    expect(headlineRow.className).toContain("row-hovered");
    expect(detailRow.className).toContain("row-hovered");

    fireEvent.mouseOut(headlineRow, { relatedTarget: null });

    expect(screen.getByTestId("row-deal-1-headline").className).not.toContain("row-hovered");
    expect(screen.getByTestId("row-deal-1-detail").className).not.toContain("row-hovered");
  });

  it("syncs focus class from headline cell and clears on blur", () => {
    renderTable();

    const headlineCell = screen.getByTestId("cell-deal-1-headline");

    fireEvent.focus(headlineCell);

    expect(screen.getByTestId("row-deal-1-headline").className).toContain("row-focused");
    expect(screen.getByTestId("row-deal-1-detail").className).toContain("row-focused");

    fireEvent.blur(headlineCell, { relatedTarget: null });

    expect(screen.getByTestId("row-deal-1-headline").className).not.toContain("row-focused");
    expect(screen.getByTestId("row-deal-1-detail").className).not.toContain("row-focused");
  });

  it("updates sort model for sortable headers and ignores non-sortable headers", () => {
    const { onSortModelChange } = renderTable();

    fireEvent.click(screen.getByRole("columnheader", { name: "Industry" }));
    expect(onSortModelChange).toHaveBeenCalledWith([{ field: "industry", sort: "asc" }]);

    onSortModelChange.mockClear();

    fireEvent.click(screen.getByRole("columnheader", { name: "Actions" }));
    expect(onSortModelChange).not.toHaveBeenCalled();
  });

  it("propagates pagination callbacks", () => {
    const { onPageChange, onRowsPerPageChange } = renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "25" },
    });
    expect(onRowsPerPageChange).toHaveBeenCalledWith(25);
  });
});
