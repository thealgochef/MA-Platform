import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";
import { describe, expect, it, vi } from "vitest";

const dataGridMockState = vi.hoisted(() => ({
  latestProps: null as Record<string, unknown> | null,
}));

vi.mock("@mui/x-data-grid", () => {
  const DataGrid = ({
    rows,
    columns,
    getRowId,
    getRowClassName,
    onRowClick,
    onRowSelectionModelChange,
    onSortModelChange,
    sx,
  }: Record<string, unknown>) => {
    dataGridMockState.latestProps = {
      rows,
      columns,
      getRowId,
      getRowClassName,
      onRowClick,
      onRowSelectionModelChange,
      onSortModelChange,
      sx,
    };

    const normalizedRows = rows as Array<Record<string, unknown>>;
    const firstRow = normalizedRows[0];
    const firstRowId =
      firstRow && ((getRowId as ((row: Record<string, unknown>) => string) | undefined)?.(firstRow) ?? String(firstRow.id));

    return (
      <div data-testid="detail-grid">
        <div className="MuiDataGrid-virtualScroller" data-testid="virtual-scroller" />
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

        <button
          type="button"
          onClick={() =>
            (onRowSelectionModelChange as ((model: { type: "include"; ids: Set<string> }) => void) | undefined)?.({
              type: "include",
              ids: new Set(firstRowId ? [firstRowId] : []),
            })
          }
        >
          Select first row
        </button>

        {normalizedRows.map((row) => {
          const rowId = (getRowId as ((row: Record<string, unknown>) => string) | undefined)?.(row) ?? String(row.id);
          const className =
            (getRowClassName as ((params: { id: string; row: Record<string, unknown> }) => string) | undefined)?.({
              id: rowId,
              row,
            }) ?? "";

          return (
            <div
              key={rowId}
              role="row"
              data-id={rowId}
              data-testid={`row-${rowId}`}
              className={className}
              onClick={() =>
                (onRowClick as ((params: { id: string; row: Record<string, unknown> }) => void) | undefined)?.({
                  id: rowId,
                  row,
                })
              }
            >
              {String(rowId)}
            </div>
          );
        })}
      </div>
    );
  };

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

import { DataGridTable } from "./DataGridTable";

type TestDeal = {
  id: string;
  industry: string;
  engagement: { stage: string } | null;
};

const rows: TestDeal[] = [
  {
    id: "deal-1",
    industry: "Technology",
    engagement: null,
  },
  {
    id: "deal-2",
    industry: "Healthcare",
    engagement: { stage: "declined" },
  },
];

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

function renderTable(overrides: Partial<React.ComponentProps<typeof DataGridTable<TestDeal>>> = {}) {
  const onRowSelectionModelChange = vi.fn();
  const onSortModelChange = vi.fn();
  const onRowClick = vi.fn();
  const onPageChange = vi.fn();
  const onRowsPerPageChange = vi.fn();

  render(
    <DataGridTable
      rows={rows}
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
    onRowSelectionModelChange,
    onSortModelChange,
    onRowClick,
    onPageChange,
    onRowsPerPageChange,
  };
}

function getLatestScrollbarSx() {
  const sx = dataGridMockState.latestProps?.sx as Record<string, unknown> | undefined;
  return sx?.["& .MuiDataGrid-scrollbar"] as Record<string, unknown> | undefined;
}

describe("DataGridTable", () => {
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

  it("calls onRowClick with the clicked row data", () => {
    const { onRowClick } = renderTable();

    fireEvent.click(screen.getByTestId("row-deal-1"));

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it("wires onRowSelectionModelChange and propagates selected ids", () => {
    const { onRowSelectionModelChange } = renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Select first row" }));

    expect(onRowSelectionModelChange).toHaveBeenCalledTimes(1);
    const [nextSelectionModel] = onRowSelectionModelChange.mock.calls[0] as [
      { type: "include"; ids: Set<string> },
    ];
    expect(nextSelectionModel.type).toBe("include");
    expect(nextSelectionModel.ids).toEqual(new Set(["deal-1"]));
  });

  it("applies row hover class on enter and removes it on leave", () => {
    renderTable();

    const row = screen.getByTestId("row-deal-1");

    fireEvent.mouseOver(row, { relatedTarget: null });
    expect(screen.getByTestId("row-deal-1").className).toContain("row-hovered");

    fireEvent.mouseOut(row, { relatedTarget: null });
    expect(screen.getByTestId("row-deal-1").className).not.toContain("row-hovered");
  });

  it("applies declined class for rows in declined engagement stage", () => {
    renderTable();

    expect(screen.getByTestId("row-deal-2").className).toContain("deal-row-declined");
  });

  it("updates sort only for sortable columns and ignores non-sortable headers", () => {
    const { onSortModelChange } = renderTable();

    fireEvent.click(screen.getByRole("columnheader", { name: "Industry" }));
    expect(onSortModelChange).toHaveBeenCalledWith([{ field: "industry", sort: "asc" }]);

    onSortModelChange.mockClear();

    fireEvent.click(screen.getByRole("columnheader", { name: "Actions" }));
    expect(onSortModelChange).not.toHaveBeenCalled();
  });

  it("activates scrollbar styles on interaction and fades after idle timeout", () => {
    vi.useFakeTimers();

    try {
      renderTable();

      expect(getLatestScrollbarSx()).toMatchObject({
        opacity: 0,
        pointerEvents: "none",
      });

      fireEvent.wheel(screen.getByTestId("detail-grid"));

      expect(getLatestScrollbarSx()).toMatchObject({
        opacity: 1,
        pointerEvents: "auto",
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(getLatestScrollbarSx()).toMatchObject({
        opacity: 0,
        pointerEvents: "none",
      });
    } finally {
      vi.useRealTimers();
    }
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
