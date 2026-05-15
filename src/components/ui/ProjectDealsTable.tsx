"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Paper, TablePagination } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowParams,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";

interface DealLike {
  id: string;
  engagement?: {
    stage: string;
  } | null;
}

interface ProjectDealsTableProps<T extends DealLike> {
  rows: T[];
  headlineColumn: GridColDef<T>;
  detailColumns: GridColDef<T>[];
  rowSelectionModel: GridRowSelectionModel;
  onRowSelectionModelChange: (model: GridRowSelectionModel) => void;
  sortModel: GridSortModel;
  onSortModelChange: (model: GridSortModel) => void;
  onRowClick?: (row: T) => void;
  sortedCount: number;
  paginationModel: GridPaginationModel;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (pageSize: number) => void;
}

const HEADLINE_COLUMN_WIDTH = 400;
const SELECTION_COLUMN_WIDTH = 50;
const HEADLINE_GRID_WIDTH = HEADLINE_COLUMN_WIDTH + SELECTION_COLUMN_WIDTH;
const SCROLLBAR_IDLE_MS = 300;

const sharedGridSx = {
  borderTop: "none",
  borderRadius: 0,
  "--DataGrid-containerBackground": "#eff2f5",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#eff2f5 !important",
    borderTop: "none",
  },
  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "#eff2f5 !important",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 700,
    color: "#6B7280",
  },
  "& .MuiDataGrid-sortButton": {
    backgroundColor: "#eff2f5 !important",
    color: "#6B7280",
  },
  "& .MuiDataGrid-sortButton:hover": {
    backgroundColor: "#eff2f5 !important",
  },
  "& .MuiDataGrid-sortButton.Mui-focusVisible": {
    backgroundColor: "#eff2f5 !important",
  },
  "& .MuiDataGrid-columnSeparator": {
    color: "#6B7280",
    opacity: 1,
  },
  "& .MuiDataGrid-columnSeparator svg": {
    color: "#6B7280",
  },
  "& .deal-row-declined": {
    opacity: 0.6,
  },
  "& .row-hovered": {
    backgroundColor: "#eff2f5 !important",
  },
  "& .row-hovered .row-hover-text": {
    color: "var(--color-primary)",
  },
  "& .row-focused .row-hover-text": {
    color: "var(--color-primary)",
  },
};

export function ProjectDealsTable<T extends DealLike>({
  rows,
  headlineColumn,
  detailColumns,
  rowSelectionModel,
  onRowSelectionModelChange,
  sortModel,
  onSortModelChange,
  onRowClick,
  sortedCount,
  paginationModel,
  onPageChange,
  onRowsPerPageChange,
}: ProjectDealsTableProps<T>) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [focusedHeadlineRowId, setFocusedHeadlineRowId] = useState<string | null>(null);
  const [isScrollbarActive, setIsScrollbarActive] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const hideScrollbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markScrollbarActive = useCallback(() => {
    setIsScrollbarActive(true);

    if (hideScrollbarTimeoutRef.current) {
      clearTimeout(hideScrollbarTimeoutRef.current);
    }

    hideScrollbarTimeoutRef.current = setTimeout(() => {
      setIsScrollbarActive(false);
      hideScrollbarTimeoutRef.current = null;
    }, SCROLLBAR_IDLE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (hideScrollbarTimeoutRef.current) {
        clearTimeout(hideScrollbarTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!tableContainerRef.current) {
      return;
    }

    const columnHeaders = tableContainerRef.current.querySelectorAll<HTMLElement>("[role='columnheader']");
    columnHeaders.forEach((header) => {
      header.tabIndex = 0;
    });
  });

  useEffect(() => {
    if (!tableContainerRef.current) {
      return;
    }

    const scrollers = tableContainerRef.current.querySelectorAll<HTMLElement>(".MuiDataGrid-virtualScroller");
    scrollers.forEach((scroller) => {
      scroller.addEventListener("scroll", markScrollbarActive, { passive: true });
    });

    return () => {
      scrollers.forEach((scroller) => {
        scroller.removeEventListener("scroll", markScrollbarActive);
      });
    };
  }, [detailColumns, markScrollbarActive, rows]);

  const fixedHeadlineColumn = useMemo<GridColDef<T>>(
    () => ({
      ...headlineColumn,
      width: HEADLINE_COLUMN_WIDTH,
      minWidth: HEADLINE_COLUMN_WIDTH,
      maxWidth: HEADLINE_COLUMN_WIDTH,
      flex: undefined,
    }),
    [headlineColumn]
  );

  const handleRowClick = (params: GridRowParams<T>) => {
    onRowClick?.(params.row);
  };

  const headlineSortableFields = useMemo(() => [fixedHeadlineColumn.field], [fixedHeadlineColumn.field]);

  const detailSortableFields = useMemo(
    () => detailColumns.filter((column) => column.sortable !== false).map((column) => column.field),
    [detailColumns]
  );

  const getGridSortModel = (sortableFields: string[]): GridSortModel => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort.sort || !sortableFields.includes(activeSort.field)) {
      return [];
    }

    return [activeSort];
  };

  const handleGridSortModelChange = (nextModel: GridSortModel, sortableFields: string[]) => {
    const nextSort = nextModel.find((item) => item.sort && sortableFields.includes(item.field));
    const activeSort = sortModel[0];

    if (!nextSort) {
      if (activeSort?.field && sortableFields.includes(activeSort.field)) {
        onSortModelChange([]);
      }
      return;
    }

    if (activeSort?.field === nextSort.field && activeSort.sort === nextSort.sort) {
      return;
    }

    onSortModelChange([nextSort]);
  };

  const getClosestRowId = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const rowElement = target.closest("[data-id]");
    return rowElement?.getAttribute("data-id") ?? null;
  };

  const handleGridMouseOver = (event: React.MouseEvent<HTMLElement>) => {
    const nextHoveredRowId = getClosestRowId(event.target);
    if (nextHoveredRowId === null) {
      return;
    }

    const previousHoveredRowId = getClosestRowId(event.relatedTarget);
    if (previousHoveredRowId === nextHoveredRowId) {
      return;
    }

    setHoveredRowId((currentHoveredRowId) =>
      currentHoveredRowId === nextHoveredRowId ? currentHoveredRowId : nextHoveredRowId
    );
  };

  const handleGridMouseOut = (event: React.MouseEvent<HTMLElement>) => {
    const exitedRowId = getClosestRowId(event.target);
    if (exitedRowId === null) {
      return;
    }

    const nextRowId = getClosestRowId(event.relatedTarget);
    if (nextRowId === exitedRowId) {
      return;
    }

    setHoveredRowId((currentHoveredRowId) =>
      currentHoveredRowId === exitedRowId ? null : currentHoveredRowId
    );
  };

  const isWithinHeadlineCell = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.closest("[data-field='headline']") !== null;
  };

  const handleHeadlineFocusIn = (event: React.FocusEvent<HTMLElement>) => {
    if (!isWithinHeadlineCell(event.target)) {
      return;
    }

    const nextFocusedRowId = getClosestRowId(event.target);
    if (nextFocusedRowId === null) {
      return;
    }

    setFocusedHeadlineRowId((currentFocusedRowId) =>
      currentFocusedRowId === nextFocusedRowId ? currentFocusedRowId : nextFocusedRowId
    );
  };

  const handleHeadlineFocusOut = (event: React.FocusEvent<HTMLElement>) => {
    if (!isWithinHeadlineCell(event.target)) {
      return;
    }

    const nextFocusedRowId = getClosestRowId(event.relatedTarget);
    if (nextFocusedRowId !== null && isWithinHeadlineCell(event.relatedTarget)) {
      setFocusedHeadlineRowId((currentFocusedRowId) =>
        currentFocusedRowId === nextFocusedRowId ? currentFocusedRowId : nextFocusedRowId
      );
      return;
    }

    setFocusedHeadlineRowId(null);
  };

  const getRowClassName = (params: { id: string | number; row: T }) => {
    let classes = "";
    if (params.row.engagement?.stage === "declined") classes += "deal-row-declined ";
    if (String(params.id) === hoveredRowId) classes += "row-hovered";
    if (String(params.id) === focusedHeadlineRowId) classes += `${classes ? " " : ""}row-focused`;
    return classes;
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: 1, overflow: "hidden", border: "1px solid #CFCFCF" }}>
      <Box
        ref={tableContainerRef}
        sx={{ width: "100%", display: "flex", border: "0px" }}
        // onMouseMove={markScrollbarActive}
        onWheel={markScrollbarActive}
        onTouchMove={markScrollbarActive}
        onKeyDown={markScrollbarActive}
      >

        <Box
          sx={{ width: HEADLINE_GRID_WIDTH, minWidth: HEADLINE_GRID_WIDTH, maxWidth: HEADLINE_GRID_WIDTH, flexShrink: 0, border: "0px" }}
          onMouseOver={handleGridMouseOver}
          onMouseOut={handleGridMouseOut}
          onFocus={handleHeadlineFocusIn}
          onBlur={handleHeadlineFocusOut}
        >
          <DataGrid
            rows={rows}
            columns={[fixedHeadlineColumn]}
            getRowId={row => row.id}
            disableRowSelectionOnClick
            hideFooter
            checkboxSelection
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={onRowSelectionModelChange}
            sortingMode="server"
            sortModel={getGridSortModel(headlineSortableFields)}
            onSortModelChange={(nextModel) =>
              handleGridSortModelChange(nextModel, headlineSortableFields)
            }
            onRowClick={handleRowClick}
            autoHeight
            columnHeaderHeight={40}
            getRowClassName={getRowClassName}
            sx={{
              ...sharedGridSx,
              borderLeft: "none",
              borderBottom: "none",
              "& .MuiDataGrid-row": {
                cursor: onRowClick ? "pointer" : "default",
              },
              "& .MuiDataGrid-columnHeaderCheckbox, & .MuiDataGrid-cellCheckbox": {
                justifyContent: "center",
              },
              "& .MuiDataGrid-checkboxInput": {
                borderRadius: "8px",
                transition: "background-color 150ms ease",
              },
              "& .MuiDataGrid-checkboxInput .MuiSvgIcon-root": {
                fontSize: 20,
              },
              "& .MuiDataGrid-virtualScroller": {
                overflow: "hidden !important",
              },
              "& .MuiDataGrid-scrollbar": {
                display: "none",
              },
              "& .MuiDataGrid-columnSeparator": {
                display: "none",
              },
            }}
          />
        </Box>

        <Box
          sx={{ minWidth: 0, flex: 1, border: "0px" }}
          onMouseOver={handleGridMouseOver}
          onMouseOut={handleGridMouseOut}
        >
          <DataGrid
            rows={rows}
            columns={detailColumns}
            getRowId={row => row.id}
            disableRowSelectionOnClick
            hideFooter
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={onRowSelectionModelChange}
            sortingMode="server"
            sortModel={getGridSortModel(detailSortableFields)}
            onSortModelChange={(nextModel) =>
              handleGridSortModelChange(nextModel, detailSortableFields)
            }
            onRowClick={handleRowClick}
            autoHeight
            columnHeaderHeight={40}
            getRowClassName={getRowClassName}
            sx={{
              ...sharedGridSx,
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              "& .MuiDataGrid-row": {
                cursor: onRowClick ? "pointer" : "default",
              },
              "& .MuiDataGrid-columnSeparator": {
                color: "#6B7280",
                opacity: 0.6,
                width: "1px",
              },
              "& .MuiDataGrid-columnSeparator svg": {
                color: "#6B7280",
              },
              "& .MuiDataGrid-scrollbar": {
                opacity: isScrollbarActive ? 1 : 0,
                pointerEvents: isScrollbarActive ? "auto" : "none",
                transition: "opacity 100ms ease",
              },
              "& .MuiDataGrid-cell[data-field='actions']": {
                display: "flex",
                alignItems: "center",
              },
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          borderTop: "1px solid #CFCFCF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "40px",
        }}
      >
        <Box sx={{ fontSize: "0.75rem", whiteSpace: "nowrap", pl: 2 }}>
          {sortedCount} item{sortedCount !== 1 ? "s" : ""}
        </Box>
        <TablePagination
          component="div"
          count={sortedCount}
          page={paginationModel.page}
          onPageChange={(_, page) => onPageChange(page)}
          rowsPerPage={paginationModel.pageSize}
          onRowsPerPageChange={event => onRowsPerPageChange(Number(event.target.value))}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Box>
      
    </Paper>
  );
}
