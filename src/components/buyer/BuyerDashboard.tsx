"use client";

import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataGridTable } from "@/components/ui/DataGridTable";
import { ProjectStatusChip, getProjectStatusLabel } from "@/components/ui/ProjectStatusChip";
import { getPreferredDealLabel } from "@/lib/deal-labels";
import { formatEngagementStageLabel } from "@/lib/engagement-stage-labels";
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
  is_active: boolean | null;
  industry: string | null;
  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;
  location: string | null;
  keywords: string[] | null;
  created_at: string | null;
}

interface Analytics {
  pursuing: number;
  passed: number;
  ndaSigned: number;
  ioisSubmitted: number;
  loisSubmitted: number;
  dealsByStage: Record<string, number>;
  avgRevenue: number | null;
  avgEbitda: number | null;
  avgMatchedRevenue: number | null;
  avgMatchedEbitda: number | null;
  dealsByIndustry: Record<string, number>;
}

interface ActivityItem {
  id: string;
  action: string;
  deal_id: string | null;
  deal_label?: string | null;
  created_at: string;
  details: Record<string, unknown> | null;
}

function getActivityDealLabel(item: ActivityItem) {
  return getPreferredDealLabel(item.deal_label);
}

export default function BuyerDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
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
    const dateDisplayFormatter = new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    const getCreatedTimestamp = (value: string | null) => {
      if (!value) {
        return Number.NEGATIVE_INFINITY;
      }

      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
    };

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
            clickable={true}
            onClick={(event) => handleStatusChipClick(event, params.row)}
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

          return `${revenue_min != null ? formatCurrency(revenue_min) + "M" : "Any"} – ${
            revenue_max != null ? formatCurrency(revenue_max) + "M" : "Any"
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

          return `${ebitda_min != null ? formatCurrency(ebitda_min) + "M" : "Any"} – ${
            ebitda_max != null ? formatCurrency(ebitda_max) + "M" : "Any"
          }`;
        },
      },
      {
        field: "created_at",
        headerName: "Created",
        flex: 0.9,
        minWidth: 120,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => getCreatedTimestamp(row.created_at),
        renderCell: (params) => {
          if (!params.row.created_at) {
            return "—";
          }

          const date = new Date(params.row.created_at);
          return Number.isNaN(date.getTime()) ? "—" : dateDisplayFormatter.format(date);
        },
      },
    ];
  }, [handleStatusChipClick]);

  const sortedProjects = useMemo(() => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort.sort) {
      return projects;
    }

    const direction = activeSort.sort === "asc" ? 1 : -1;
    const getCreatedTimestamp = (value: string | null) => {
      if (!value) {
        return Number.NEGATIVE_INFINITY;
      }

      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
    };

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
          return getCreatedTimestamp(project.created_at);
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

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const isAbortError = (error: unknown) =>
      error instanceof DOMException && error.name === "AbortError";

    const fetchData = async () => {
      try {
        const [projectsResult, analyticsResult] = await Promise.allSettled([
          fetch("/api/projects", { signal: abortController.signal }),
          fetch("/api/buyer/analytics", { signal: abortController.signal }),
        ]);

        if (projectsResult.status === "fulfilled") {
          if (projectsResult.value.ok) {
            const data = await projectsResult.value.json();
            if (isMounted) {
              setProjects(data.projects || []);
            }
          } else {
            console.error("Failed to fetch buyer projects", {
              status: projectsResult.value.status,
              statusText: projectsResult.value.statusText,
            });
          }
        } else if (!isAbortError(projectsResult.reason)) {
          console.error("Failed to fetch buyer projects", projectsResult.reason);
        }

        if (analyticsResult.status === "fulfilled") {
          if (analyticsResult.value.ok) {
            const data = await analyticsResult.value.json();
            if (isMounted) {
              setAnalytics(data.analytics || null);
              setActivity(data.activity || []);
            }
          } else {
            console.error("Failed to fetch buyer analytics", {
              status: analyticsResult.value.status,
              statusText: analyticsResult.value.statusText,
            });
          }
        } else if (!isAbortError(analyticsResult.reason)) {
          console.error("Failed to fetch buyer analytics", analyticsResult.reason);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        console.error("Failed to load buyer dashboard", error);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
          <a
            href="/projects/new"
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover"
          >
            New Project
          </a>
        </div>

        {error && (
          <div className="bg-error/10 border border-error rounded-md p-4 mb-6">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Analytics Section */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Link
              href="/projects/engagements"
              className="bg-surface-alt rounded-lg border border-border-color p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="View all deals pursuing across projects"
            >
              <p className="text-xs text-text-secondary">Deals Pursuing</p>
              <p className="text-2xl font-bold text-primary">{analytics.pursuing}</p>
            </Link>
            <Link
              href="/projects/engagements"
              className="bg-surface-alt rounded-lg border border-border-color p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="View all deals passed across projects"
            >
              <p className="text-xs text-text-secondary">Deals Passed</p>
              <p className="text-2xl font-bold text-primary">{analytics.passed}</p>
            </Link>
            <div className="bg-surface-alt rounded-lg border border-border-color p-4">
              <p className="text-xs text-text-secondary">NDAs Signed</p>
              <p className="text-2xl font-bold text-primary">{analytics.ndaSigned}</p>
            </div>
            <div className="bg-surface-alt rounded-lg border border-border-color p-4">
              <p className="text-xs text-text-secondary">IOIs Submitted</p>
              <p className="text-2xl font-bold text-primary">{analytics.ioisSubmitted}</p>
            </div>
            <div className="bg-surface-alt rounded-lg border border-border-color p-4">
              <p className="text-xs text-text-secondary">LOIs Submitted</p>
              <p className="text-2xl font-bold text-primary">{analytics.loisSubmitted}</p>
            </div>
          </div>
        )}

        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-alt rounded-lg border border-border-color p-4">
              <p className="text-xs text-text-secondary">Avg Revenue (Pursued)</p>
              <p className="text-lg font-bold text-primary">
                {analytics.avgRevenue != null ? formatCurrency(analytics.avgRevenue) + "M" : "—"}
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg border border-border-color p-4">
              <p className="text-xs text-text-secondary">Avg EBITDA (Pursued)</p>
              <p className="text-lg font-bold text-primary">
                {analytics.avgEbitda != null ? formatCurrency(analytics.avgEbitda) + "M" : "—"}
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg border border-border-color p-4">
              <p className="text-xs text-text-secondary">Avg Revenue (Matched)</p>
              <p className="text-lg font-bold text-primary">
                {analytics.avgMatchedRevenue != null ? formatCurrency(analytics.avgMatchedRevenue) + "M" : "—"}  
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg border border-border-color p-4">
              <p className="text-xs text-text-secondary">Avg EBITDA (Matched)</p>
              <p className="text-lg font-bold text-primary">
                {analytics.avgMatchedEbitda != null ? formatCurrency(analytics.avgMatchedEbitda) + "M" : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Deals by Industry / Stage */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/projects/engagements"
              className="bg-surface-alt rounded-lg border border-border-color p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="View all deals by stage across projects"
            >
              <h3 className="text-sm font-medium text-text mb-3">Deals by Stage</h3>
              {Object.entries(analytics.dealsByStage).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.dealsByStage).map(([stage, count]) => (
                    <div key={stage} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{formatEngagementStageLabel(stage)}</span>
                      <span className="text-primary font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No active engagements.</p>
              )}
            </Link>
            <Link
              href="/projects/engagements"
              className="bg-surface-alt rounded-lg border border-border-color p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="View all deals by industry across projects"
            >
              <h3 className="text-sm font-medium text-text mb-3">Deals by Industry</h3>
              {Object.entries(analytics.dealsByIndustry).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.dealsByIndustry).map(([industry, count]) => (
                    <div key={industry} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{industry}</span>
                      <span className="text-primary font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No data yet.</p>
              )}
            </Link>
          </div>
        )}

        {/* Recent Activity Feed */}
        {activity.length > 0 && (
          <div className="bg-surface-alt rounded-lg border border-border-color p-4 mb-8">
            <h3 className="text-sm font-medium text-text mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {activity.slice(0, 10).map((item) => (
                <div key={item.id} className="flex justify-between text-sm border-b border-border-gray pb-2 last:border-0">
                  <span className="text-text-secondary">
                    <span>{formatEngagementStageLabel(item.action)}</span>{" "}
                    - {getActivityDealLabel(item)}
                  </span>
                  <span className="text-xs text-text-secondary">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Tiles */}
        <h2 className="text-lg font-semibold text-primary mb-4">Your Projects</h2>

        {projects.length === 0 ? (
          <div className="bg-surface-alt rounded-lg border border-border-color p-8 text-center">
            <p className="text-text-secondary mb-4">Create your first acquisition project</p>
            <a
              href="/projects/new"
              className="px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover"
            >
              Create Project
            </a>
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
    </main>
  );
}
