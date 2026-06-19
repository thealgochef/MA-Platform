"use client";

import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataGridTable } from "@/components/ui/DataGridTable";
import { ProjectStatusChip, getProjectStatusLabel } from "@/components/ui/ProjectStatusChip";
import { formatCurrency } from "@/lib/utils";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";
import { Menu, MenuItem } from "@mui/material";

interface Project {
  id: string;
  name: string;
  is_active: boolean;
  industry: string | null;
  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;
  location: string | null;
  keywords: string[];
  created_at: string;
}

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [statusMenuProject, setStatusMenuProject] = useState<Project | null>(null);
  const [statusUpdateProjectId, setStatusUpdateProjectId] = useState<string | null>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        } else {
          setError("Failed to load projects.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const closeStatusMenu = useCallback(() => {
    setStatusMenuAnchorEl(null);
    setStatusMenuProject(null);
  }, []);

  const handleStatusChipClick = useCallback((event: MouseEvent<HTMLElement>, project: Project) => {
    event.preventDefault();
    event.stopPropagation();
    setStatusMenuAnchorEl(event.currentTarget);
    setStatusMenuProject(project);
  }, []);

  const handleEditProject = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!statusMenuProject) {
      closeStatusMenu();
      return;
    }

    closeStatusMenu();
    router.push(`/projects/${statusMenuProject.id}/edit`);
  }, [closeStatusMenu, router, statusMenuProject]);

  const handleToggleProjectStatus = useCallback(async (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!statusMenuProject) {
      closeStatusMenu();
      return;
    }

    const nextIsActive = !statusMenuProject.is_active;
    setStatusUpdateProjectId(statusMenuProject.id);

    try {
      const response = await fetch(`/api/projects/${statusMenuProject.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      if (!response.ok) {
        setError("Failed to update project status.");
        return;
      }

      const payload = await response.json().catch(() => null);
      const resolvedIsActive = typeof payload?.project?.is_active === "boolean"
        ? payload.project.is_active
        : nextIsActive;

      setProjects((prev) => prev.map((project) => (
        project.id === statusMenuProject.id
          ? { ...project, is_active: resolvedIsActive }
          : project
      )));
    } catch (toggleError) {
      console.error("Failed to toggle project status", toggleError);
      setError("Network error. Please try again.");
    } finally {
      setStatusUpdateProjectId(null);
      closeStatusMenu();
    }
  }, [closeStatusMenu, statusMenuProject]);

  const columns = useMemo<GridColDef<Project>[]>(() => {
    return [
      {
        field: "name",
        headerName: "Project Name",
        flex: 1.3,
        minWidth: 200,
        cellClassName: "font-bold text-primary",
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        minWidth: 120,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => getProjectStatusLabel(row.is_active),
        renderCell: (params) => (
          <ProjectStatusChip
            isActive={params.row.is_active}
            onClick={(event) => handleStatusChipClick(event, params.row)}
            clickable
          />
        ),
      },
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 140,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => row.industry || "—",
      },
      {
        field: "location",
        headerName: "Location",
        flex: 1,
        minWidth: 130,
        cellClassName: "row-hover-text",  
        valueGetter: (_, row) => row.location || "—",
      },
      {
        field: "revenue",
        headerName: "Revenue Range",
        flex: 1,
        minWidth: 160,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => row.revenue_min ?? row.revenue_max ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) => {
          const { revenue_min, revenue_max } = params.row;
          if (revenue_min == null && revenue_max == null) {
            return "—";
          }

          return `${revenue_min != null ? formatCurrency(revenue_min) + 'M': "Any"} – ${
            revenue_max != null ? formatCurrency(revenue_max) + 'M': "Any"
          }`;
        },
      },
      {
        field: "ebitda",
        headerName: "EBITDA",
        flex: 1,
        minWidth: 160,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => row.ebitda_min ?? row.ebitda_max ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) => {
          const { ebitda_min, ebitda_max } = params.row;
          if (ebitda_min == null && ebitda_max == null) {
            return "—";
          }

          return `${ebitda_min != null ? formatCurrency(ebitda_min) + 'M': "Any"} – ${
            ebitda_max != null ? formatCurrency(ebitda_max) + 'M': "Any"
          }`;
        },
      },
      {
        field: "created_at",
        headerName: "Created",
        flex: 0.9,
        minWidth: 120,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => new Date(row.created_at).getTime(),
        renderCell: (params) => DATE_DISPLAY_FORMATTER.format(new Date(params.row.created_at)),
      },
    ];
  }, [handleStatusChipClick]);

  const sortedProjects = useMemo(() => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort.sort) {
      return projects;
    }

    const direction = activeSort.sort === "asc" ? 1 : -1;
    const getValue = (project: Project) => {
      switch (activeSort.field) {
        case "name":
          return project.name;
        case "status":
          return getProjectStatusLabel(project.is_active);
        case "industry":
          return project.industry || "";
        case "location":
          return project.location || "";
        case "revenue":
          return project.revenue_min ?? project.revenue_max ?? Number.NEGATIVE_INFINITY;
        case "ebitda":
          return project.ebitda_min ?? project.ebitda_max ?? Number.NEGATIVE_INFINITY;
        case "created_at":
          return new Date(project.created_at).getTime();
        default:
          return "";
      }
    };

    return [...projects].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return (
        String(aValue).localeCompare(String(bValue), undefined, {
          sensitivity: "base",
          numeric: true,
        }) * direction
      );
    });
  }, [projects, sortModel]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedProjects.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({ ...prev, page: maxPage }));
    }
  }, [paginationModel.page, paginationModel.pageSize, sortedProjects.length]);

  const pagedProjects = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return sortedProjects.slice(start, start + paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize, sortedProjects]);

  const statusMenuItemSx = {
    borderRadius: 1,
    px: 1.5,
    py: 1,
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--color-text)",
    "&:hover": {
      backgroundColor: "var(--color-subtle)",
      color: "var(--color-primary)",
    },
    "&.Mui-focusVisible": {
      backgroundColor: "var(--color-subtle)",
      color: "var(--color-primary)",
      outline: "2px solid var(--color-border)",
      outlineOffset: "-2px",
    },
    "&.Mui-selected, &.Mui-selected:hover": {
      backgroundColor: "var(--color-subtle)",
      color: "var(--color-primary)",
    },
    "&.Mui-disabled": {
      color: "var(--color-text)",
      opacity: 0.45,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-alt py-8">
      <div className="w-full px-5 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">Acquisition Projects</h1>
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
          >
            New Project
          </Link>
        </div>

        {error && (
          <div className="bg-error/10 border border-error rounded-md p-4 mt-6">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}
      </div>

      <div className="w-full px-4 pb-8">
        <div>
          {projects.length === 0 ? (
            <div className="bg-surface-alt rounded-lg border border-border-color p-8 text-center">
              <p className="text-text-secondary mb-4">
                Create your first acquisition project to start matching with deals.
              </p>
              <Link
                href="/projects/new"
                className="inline-block px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
              >
                Create Project
              </Link>
            </div>
          ) : (
            <>
              <DataGridTable
                rows={pagedProjects}
                detailColumns={columns}
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={setRowSelectionModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                onRowClick={(row) => router.push(`/projects/${row.id}`)}
                sortedCount={sortedProjects.length}
                paginationModel={paginationModel}
                onPageChange={(page) => setPaginationModel((prev) => ({ ...prev, page }))}
                onRowsPerPageChange={(pageSize) => setPaginationModel({ page: 0, pageSize })}
              />
              <Menu
                anchorEl={statusMenuAnchorEl}
                open={Boolean(statusMenuAnchorEl)}
                onClose={closeStatusMenu}
                slotProps={{
                  paper: {
                    elevation: 0,
                    sx: {
                      mt: 0.75,
                      borderRadius: 1.5,
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-surface-alt)",
                      boxShadow: "0px 10px 24px rgba(45, 106, 79, 0.12)",
                      minWidth: 180,
                    },
                  },
                  list: {
                    sx: {
                      p: 0.5,
                      display: "grid",
                      gap: 0.25,
                    },
                  },
                }}
              >
                <MenuItem onClick={handleEditProject} sx={statusMenuItemSx}>Edit Project</MenuItem>
                <MenuItem
                  onClick={handleToggleProjectStatus}
                  disabled={Boolean(statusMenuProject && statusUpdateProjectId === statusMenuProject.id)}
                  sx={statusMenuItemSx}
                >
                  {statusMenuProject?.is_active ? "Pause Project" : "Resume Project"}
                </MenuItem>
              </Menu>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
