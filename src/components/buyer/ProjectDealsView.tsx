"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useAutoDismissFlag } from "@/lib/useAutoDismissFlag";
import { ProjectDealsTable } from "@/components/ui/ProjectDealsTable";
import { Box, Button, Chip, Stack, Tab } from "@mui/material";
import { PrimaryTabs } from "@/components/ui/PrimaryTabs";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";

type ProjectDealsViewMode = "matches" | "active" | "archive";

interface Deal {
  id: string;
  headline: string;
  industry: string;
  state: string | null;
  region: string | null;
  geography_display: string;
  status: string;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  engagement: {
    id: string;
    stage: string;
    nda_status: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
}

const ARCHIVED_STAGES = new Set(["declined", "passed"]);
const INACTIVE_STAGES = new Set(["declined", "passed", "terminated", "closed"]);

function getViewModeFromPath(pathname: string | null): ProjectDealsViewMode {
  if (pathname?.endsWith("/active")) {
    return "active";
  }

  if (pathname?.endsWith("/archive")) {
    return "archive";
  }

  return "matches";
}

function getVisibleDeals(deals: Deal[], viewMode: ProjectDealsViewMode): Deal[] {
  if (viewMode === "active") {
    return deals.filter((deal) => {
      const stage = deal.engagement?.stage;
      if (!stage) {
        return false;
      }

      return !INACTIVE_STAGES.has(stage);
    });
  }

  if (viewMode === "archive") {
    return deals.filter((deal) => ARCHIVED_STAGES.has(deal.engagement?.stage ?? ""));
  }

  return deals.filter((deal) => {
    const stage = deal.engagement?.stage;

    // Matches should only show unengaged deals.
    return !stage;
  });
}

function getEmptyStateMessage(viewMode: ProjectDealsViewMode): string {
  if (viewMode === "active") {
    return "No deals with active engagements yet.";
  }

  if (viewMode === "archive") {
    return "No archived deals yet.";
  }

  return "No matching deals found. Try adjusting your project criteria.";
}

export default function ProjectDealsView({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = getViewModeFromPath(pathname);
  const shouldShowSavedBanner = viewMode === "matches" && searchParams.get("saved") === "1";
  const [project, setProject] = useState<Project | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { isVisible: showSavedBanner, setIsVisible: setShowSavedBanner } = useAutoDismissFlag(shouldShowSavedBanner);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const fetchDeals = useCallback(
    async (cursor?: string) => {
      const url = `/api/projects/${projectId}/matches${cursor ? `?cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setDeals((prev) => [...prev, ...data.deals]);
        } else {
          setDeals(data.deals || []);
        }
        setNextCursor(data.nextCursor);
      }
    },
    [projectId]
  );

  useEffect(() => {
    const loadData = async () => {
      const projRes = await fetch(`/api/projects/${projectId}`);
      if (projRes.ok) {
        const data = await projRes.json();
        setProject(data.project);
      }
      await fetchDeals();
      setLoading(false);
    };

    void loadData();
  }, [projectId, fetchDeals]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchDeals(nextCursor);
    setLoadingMore(false);
  };

  const handlePursue = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const res = await fetch(`/api/deals/${dealId}/pursue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) {
      const { engagement } = await res.json();
      setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, engagement } : deal)));
    }
    setActionLoading(null);
  }, [projectId]);

  const handleDecline = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const res = await fetch(`/api/deals/${dealId}/decline`, {
      method: "POST",
    });
    if (res.ok) {
      const { engagement } = await res.json();
      setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, engagement } : deal)));
    }
    setActionLoading(null);
  }, []);

  const getGeography = (deal: Deal) => {
    return deal.geography_display === "state" ? deal.state : deal.region;
  };

  const visibleDeals = getVisibleDeals(deals, viewMode);
  const emptyStateMessage = getEmptyStateMessage(viewMode);

  const headlineColumn = useMemo<GridColDef<Deal>>(() => {
    return {
      field: "headline",
      headerName: "Headline",
      width: 240,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ color: "#111827" }}>
          <Link
            href={`/deals/${params.row.id}`}
            tabIndex={params.hasFocus ? 0 : -1}
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="rounded-sm text-text hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {params.row.headline}
          </Link>
        </Box>
      ),
    };
  }, []);

  const detailColumns = useMemo<GridColDef<Deal>[]>(() => {
    return [
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "geography",
        headerName: "Geography",
        flex: 0.9,
        minWidth: 130,
        valueGetter: (_, row) => getGeography(row) || "—",
      },
      {
        field: "revenue_year_3",
        headerName: "Revenue",
        flex: 0.9,
        minWidth: 130,
        valueGetter: (_, row) => row.revenue_year_3,
        renderCell: (params) =>
          params.row.revenue_year_3 != null ? formatCurrency(params.row.revenue_year_3) + "M": "—",
      },
      {
        field: "ebitda_year_3",
        headerName: "EBITDA",
        flex: 0.9,
        minWidth: 130,
        valueGetter: (_, row) => row.ebitda_year_3,
        renderCell: (params) =>
          params.row.ebitda_year_3 != null ? formatCurrency(params.row.ebitda_year_3) + "M": "—",
      },
      {
        field: "status",
        headerName: "Deal Status",
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: (params) => (
          <Chip
            label={DEAL_STATUS_LABELS[params.row.status] || params.row.status}
            size="small"
            sx={{ backgroundColor: "#10B9811A", color: "#10B981", fontWeight: 500 }}
          />
        ),
      },
      {
        field: "engagement_status",
        headerName: "Engagement Status",
        flex: 1,
        minWidth: 170,
        sortable: false,
        renderCell: (params) =>
          params.row.engagement ? (
            <Chip
              label={params.row.engagement.stage.replace(/_/g, " ")}
              size="small"
              sx={{ textTransform: "capitalize" }}
              variant="outlined"
            />
          ) : (
            <span style={{ color: "#9CA3AF" }}>—</span>
          ),
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const isEngaged = Boolean(params.row.engagement) && params.row.engagement?.stage !== "declined";
          const isDeclined = params.row.engagement?.stage === "declined";

          return (
            <>
              {!isEngaged && !isDeclined && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                    textTransform: "none",
                    borderRadius: 1,
                    px: 1.75,
                    fontWeight: 600,
                    backgroundColor: "var(--color-primary)",
                    "&:hover": { backgroundColor: "var(--color-btn-hover)" }
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handlePursue(params.row.id);
                    }}
                    disabled={actionLoading === params.row.id}
                  >
                    Pursue
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                    textTransform: "none",
                    borderRadius: 1,
                    px: 1.75,
                    fontWeight: 600,
                    borderColor: "var(--color-border)",
                    color: "var(--color-secondary)",
                    "&:hover": {
                      borderColor: "var(--color-secondary)",
                      backgroundColor: "var(--color-faint)",
                    },
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDecline(params.row.id);
                    }}
                    disabled={actionLoading === params.row.id}
                  >
                    Decline
                  </Button>
                </Stack>
              )}
              {isDeclined && (
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    textTransform: "none",
                    borderRadius: 1,
                    px: 1.75,
                    fontWeight: 600,
                    backgroundColor: "var(--color-primary)",
                    "&:hover": { backgroundColor: "var(--color-btn-hover)" }
                    }}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handlePursue(params.row.id);
                  }}
                  disabled={actionLoading === params.row.id}
                >
                  Pursue
                </Button>
              )}
            </>
          );
        },
      },
    ];
  }, [actionLoading, handleDecline, handlePursue]);

  const sortedDeals = useMemo(() => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort?.sort) {
      return visibleDeals;
    }

    const direction = activeSort.sort === "asc" ? 1 : -1;
    const getValue = (deal: Deal) => {
      switch (activeSort.field) {
        case "headline":
          return deal.headline;
        case "industry":
          return deal.industry;
        case "geography":
          return getGeography(deal) || "";
        case "revenue_year_3":
          return deal.revenue_year_3 ?? Number.NEGATIVE_INFINITY;
        case "ebitda_year_3":
          return deal.ebitda_year_3 ?? Number.NEGATIVE_INFINITY;
        default:
          return "";
      }
    };

    return [...visibleDeals].sort((a, b) => {
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
  }, [sortModel, visibleDeals]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedDeals.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({ ...prev, page: maxPage }));
    }
  }, [sortedDeals.length, paginationModel.page, paginationModel.pageSize]);

  const pagedDeals = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return sortedDeals.slice(start, start + paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize, sortedDeals]);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading deals...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt">
      <div className="bg-bg pt-8 border-b border-border-gray">
        <div className="max-w-6xl mx-auto px-4">
          {showSavedBanner && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              <p>Changes saved.</p>
              <button
                type="button"
                onClick={() => setShowSavedBanner(false)}
                className="shrink-0 text-success/80 transition-colors hover:text-success"
                aria-label="Dismiss saved confirmation"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">{project?.name || "Project"}</h1>
              <p className="text-sm text-text-secondary">
                {visibleDeals.length} {viewMode === "matches" ? "matched" : viewMode} deal
                {visibleDeals.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/projects/${projectId}/edit`}
                className="px-3 py-1 bg-surface-alt border border-border-gray text-text rounded-md text-sm hover:bg-bg-alt"
              >
                Edit
              </Link>
              <Link href="/dashboard" className="text-sm text-secondary hover:underline hover:text-primary self-center">
                Dashboard
              </Link>
            </div>
          </div>

          <div>
            <PrimaryTabs
              value={viewMode}
              onChange={(_, newValue) => {
                const routes: Record<ProjectDealsViewMode, string> = {
                  matches: `/projects/${projectId}`,
                  active: `/projects/${projectId}/active`,
                  archive: `/projects/${projectId}/archive`,
                };

                if (newValue !== "matches" && newValue !== "active" && newValue !== "archive") {
                  return;
                }

                if (newValue === "matches") {
                  router.push(routes.matches);
                  return;
                }

                if (newValue === "active") {
                  router.push(routes.active);
                  return;
                }

                router.push(routes.archive);
              }}
            >
              <Tab label="Matches" value="matches" />
              <Tab label="Active" value="active" />
              <Tab label="Archived" value="archive" />
            </PrimaryTabs>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="pt-4">
          {visibleDeals.length === 0 ? (
            <div className="bg-surface-alt rounded-lg shadow-md p-8 text-center text-text-secondary">
              {emptyStateMessage}
            </div>
          ) : (
            <ProjectDealsTable
              rows={pagedDeals}
              headlineColumn={headlineColumn}
              detailColumns={detailColumns}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={setRowSelectionModel}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              onRowClick={(row) => router.push(`/deals/${row.id}`)}
              sortedCount={sortedDeals.length}
              paginationModel={paginationModel}
              onPageChange={(page) => setPaginationModel((prev) => ({ ...prev, page }))}
              onRowsPerPageChange={(pageSize) => setPaginationModel({ page: 0, pageSize })}
            />
          )}

          {viewMode === "matches" && nextCursor && (
            <div className="mt-4 text-center">
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="px-6 py-2 bg-surface-alt border border-border-gray rounded-md text-sm hover:bg-bg-alt disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
