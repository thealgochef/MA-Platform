"use client";

import { useState } from "react";
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

const sharedGridSx = {
  borderRadius: 0,
  "--DataGrid-containerBackground": "var(--color-neutral-btn-hover)",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "var(--color-neutral-btn-hover) !important"
  },
  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "var(--color-neutral-btn-hover) !important",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 700,
    color: "#6B7280",
  },
  "& .MuiDataGrid-sortButton": {
    backgroundColor: "var(--color-neutral-btn-hover) !important",
    color: "#6B7280",
  },
  "& .MuiDataGrid-sortButton:hover": {
    backgroundColor: "var(--color-neutral-btn-hover) !important",
  },
  "& .MuiDataGrid-sortButton.Mui-focusVisible": {
    backgroundColor: "var(--color-neutral-btn-hover) !important",
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
    <Paper elevation={2} sx={{ borderRadius: 1, overflow: "hidden", border: "1px solid #CFCFCF" }}>
      <Box sx={{ width: "100%", display: "flex", border: "0px"}}>

        <Box
          sx={{ width: 288, flexShrink: 0, border: "0px" }}
          onMouseMove={e => {
            const row = (e.target as HTMLElement).closest('[data-id]');
            if (row) setHoveredRowId(row.getAttribute('data-id') || null);
          }}
          onMouseLeave={() => setHoveredRowId(null)}
        >
          <DataGrid
            rows={rows}
            columns={[headlineColumn]}
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
