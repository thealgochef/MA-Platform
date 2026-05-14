"use client";

import { useMemo, useState } from "react";
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
    backgroundColor: "rgba(107, 114, 128, 0.08) !important",
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

  const getRowClassName = (params: { id: string | number; row: T }) => {
    let classes = "";
    if (params.row.engagement?.stage === "declined") classes += "deal-row-declined ";
    if (String(params.id) === hoveredRowId) classes += "row-hovered";
    return classes;
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: 1, overflow: "hidden", border: "1px solid #CFCFCF" }}>
      <Box sx={{ width: "100%", display: "flex", border: "0px"}}>

        <Box
          sx={{ width: HEADLINE_GRID_WIDTH, minWidth: HEADLINE_GRID_WIDTH, maxWidth: HEADLINE_GRID_WIDTH, flexShrink: 0, border: "0px" }}
          onMouseMove={e => {
            const row = (e.target as HTMLElement).closest('[data-id]');
            if (row) setHoveredRowId(row.getAttribute('data-id') || null);
          }}
          onMouseLeave={() => setHoveredRowId(null)}
        >
          <DataGrid
            rows={rows}
            columns={[fixedHeadlineColumn]}
            getRowId={row => row.id}
            disableRowSelectionOnClick
            disableColumnSorting
            hideFooter
            checkboxSelection
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={onRowSelectionModelChange}
            sortingMode="server"
            sortModel={sortModel}
            onSortModelChange={onSortModelChange}
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
          onMouseMove={e => {
            const row = (e.target as HTMLElement).closest('[data-id]');
            if (row) setHoveredRowId(row.getAttribute('data-id') || null);
          }}
          onMouseLeave={() => setHoveredRowId(null)}
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
            sortModel={sortModel}
            onSortModelChange={onSortModelChange}
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
              "& .MuiDataGrid-cell[data-field='actions']": {
              display: "flex",
              alignItems: "center",
              }
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          borderTop: "1px solid #CFCFCF",
          backgroundColor: "var(--color-surface-alt)",
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
