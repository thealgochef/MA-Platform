"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatEngagementStageLabel } from "@/lib/engagement-stage-labels";
import { formatCurrency, formatIndustryDisplay } from "@/lib/utils";
import { useAutoDismissFlag } from "@/lib/useAutoDismissFlag";
import { ProjectDealsTable } from "@/components/ui/ProjectDealsTable";
import { ProjectDealDrawer, type ProjectDealDrawerDeal } from "@/components/buyer/ProjectDealDrawer";
import { canBuyerAccessIoiWorkflow, canBuyerAccessLoiWorkflow } from "@/lib/buyer-workflow-gating";
import { Box, Chip, Tab } from "@mui/material";
import { PrimaryTabs } from "@/components/ui/PrimaryTabs";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";

type ProjectDealsViewMode = "matches" | "active" | "archive";

type Deal = ProjectDealDrawerDeal;

interface DealActionConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "contained" | "outlined";
}

interface Project {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  created_at: string | null;
}

const ARCHIVED_STAGES = new Set(["declined", "passed"]);
const INACTIVE_STAGES = new Set(["declined", "passed", "terminated", "closed"]);
const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

export function isProjectDealsViewMode(value: unknown): value is ProjectDealsViewMode {
  return value === "matches" || value === "active" || value === "archive";
}

function getRouteForViewMode(projectId: string, viewMode: ProjectDealsViewMode): string {
  if (viewMode === "matches") {
    return `/projects/${projectId}`;
  }

  if (viewMode === "active") {
    return `/projects/${projectId}/active`;
  }

  return `/projects/${projectId}/archive`;
}

export function getProjectDealsRouteForTabChange(projectId: string, value: unknown): string | null {
  if (!isProjectDealsViewMode(value)) {
    return null;
  }

  return getRouteForViewMode(projectId, value);
}

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

function formatDateReceived(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return DATE_DISPLAY_FORMATTER.format(parsed);
}

function getDateReceivedSortValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  const timestamp = parsed.getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function getEffectiveDateReceived(
  dealDateReceived: string | null | undefined,
  projectCreatedAt: string | null | undefined
): string | null | undefined {
  if (!dealDateReceived) {
    return dealDateReceived;
  }

  const parsedDealDate = new Date(dealDateReceived);
  const dealTimestamp = parsedDealDate.getTime();
  if (Number.isNaN(dealTimestamp) || !projectCreatedAt) {
    return dealDateReceived;
  }

  const parsedProjectCreatedAt = new Date(projectCreatedAt);
  const projectTimestamp = parsedProjectCreatedAt.getTime();
  if (Number.isNaN(projectTimestamp)) {
    return dealDateReceived;
  }

  return dealTimestamp < projectTimestamp ? projectCreatedAt : dealDateReceived;
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

function getDealActions(
  deal: Deal,
  options: {
    onNavigate: (href: string) => void;
    onPursue: (dealId: string) => void;
    onDecline: (dealId: string) => void;
    actionLoadingDealId: string | null;
  }
): DealActionConfig[] {
  const stage = deal.engagement?.stage;
  const isNdaPending = stage === "nda_pending";
  const isEngaged = Boolean(deal.engagement) && stage !== "declined";
  const isDeclined = stage === "declined";
  const isLoading = options.actionLoadingDealId === deal.id;
  const canAccessIoiWorkflow = canBuyerAccessIoiWorkflow({
    isApprovedBuyer: true,
    dealStatus: deal.status,
    engagement: deal.engagement,
  });
  const canAccessLoiWorkflow = canBuyerAccessLoiWorkflow({
    isApprovedBuyer: true,
    dealStatus: deal.status,
    engagement: deal.engagement,
  });

  const primaryAction = (() => {
    if (stage === "nda_pending") {
      return {
      label: "Sign NDA",
      onClick: () => options.onNavigate(`/deals/${deal.id}/nda`),
      };
    }

    if (stage === "nda_signed" && canAccessIoiWorkflow) {
      return {
      label: "Submit IOI",
      onClick: () => options.onNavigate(`/deals/${deal.id}/ioi`),
      };
    }

    if (stage === "ioi_submitted" && canAccessIoiWorkflow) {
      return {
      label: "View IOI",
      onClick: () => options.onNavigate(`/deals/${deal.id}/ioi`),
      };
    }

    if ((stage === "ioi_submitted" || stage === "loi_submitted") && canAccessLoiWorkflow) {
      return {
      label: stage === "loi_submitted" ? "View LOI" : "Submit LOI",
      onClick: () => options.onNavigate(`/deals/${deal.id}/loi`),
      };
    }

    if (!isEngaged || isDeclined) {
      return {
        label: "Pursue",
        onClick: () => options.onPursue(deal.id),
        disabled: isLoading,
      };
    }

    return null;
  })();

  const shouldRenderSinglePrimaryAction = Boolean(primaryAction) && (isNdaPending || isDeclined || isEngaged);
  if (shouldRenderSinglePrimaryAction && primaryAction) {
    return [primaryAction];
  }

  if (!isNdaPending && !isEngaged && !isDeclined) {
    return [
      {
        label: "Pursue",
        onClick: () => options.onPursue(deal.id),
        disabled: isLoading,
      },
      {
        label: "Decline",
        onClick: () => options.onDecline(deal.id),
        disabled: isLoading,
        variant: "outlined",
      },
    ];
  }

  return [];
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
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

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

  const projectCreatedAt = project?.created_at;

  const visibleDeals = getVisibleDeals(deals, viewMode);
  const emptyStateMessage = getEmptyStateMessage(viewMode);
  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) ?? null,
    [deals, selectedDealId]
  );
  const selectedDealActions = useMemo(() => {
    if (!selectedDeal) {
      return [];
    }

    return getDealActions(selectedDeal, {
      onNavigate: (href) => router.push(href),
      onPursue: (dealId) => void handlePursue(dealId),
      onDecline: (dealId) => void handleDecline(dealId),
      actionLoadingDealId: actionLoading,
    });
  }, [actionLoading, handleDecline, handlePursue, router, selectedDeal]);

  const openDealDrawer = useCallback((deal: Deal, trigger?: HTMLElement | null) => {
    drawerTriggerRef.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setSelectedDealId(deal.id);
  }, []);

  const closeDealDrawer = useCallback(() => {
    setSelectedDealId(null);
  }, []);

  const headlineColumn = useMemo<GridColDef<Deal>>(() => {
    return {
      field: "headline",
      headerName: "Headline",
      cellClassName: "row-hover-text",
      renderCell: (params) => (
        <Box sx={{ color: "inherit" }}>
          <button
            type="button"
            tabIndex={params.hasFocus ? 0 : -1}
            onClick={(event) => {
              event.stopPropagation();
              openDealDrawer(params.row, event.currentTarget);
            }}
            className="rounded-sm text-left text-inherit focus-visible:outline-none focus-visible:underline"
          >
            {params.row.headline}
          </button>
        </Box>
      ),
    };
  }, [openDealDrawer]);

  const detailColumns = useMemo<GridColDef<Deal>[]>(() => {
    return [
      {
        field: "date_received",
        headerName: "Date Received",
        flex: 0.9,
        minWidth: 120,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => getEffectiveDateReceived(row.date_received, projectCreatedAt),
        renderCell: (params) =>
          formatDateReceived(getEffectiveDateReceived(params.row.date_received, projectCreatedAt)),
      },
      {
        field: "revenue_year_3",
        headerName: "Revenue",
        flex: 0.9,
        minWidth: 120,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => row.revenue_year_3,
        renderCell: (params) =>
          params.row.revenue_year_3 != null ? formatCurrency(params.row.revenue_year_3) + "M": "—",
      },
      {
        field: "ebitda_year_3",
        headerName: "EBITDA",
        flex: 0.9,
        minWidth: 120,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => row.ebitda_year_3,
        renderCell: (params) =>
          params.row.ebitda_year_3 != null ? formatCurrency(params.row.ebitda_year_3) + "M": "—",
      },
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 120,
        valueGetter: (_, row) => formatIndustryDisplay(row.industry),
        cellClassName: "row-hover-text",
      },
      {
        field: "geography",
        headerName: "Location",
        flex: 0.9,
        minWidth: 120,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => getGeography(row) || "—",
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
            sx={{ backgroundColor: "#10B9811A", color: "#10B981", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "engagement_status",
        headerName: "Engagement",
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: (params) =>
          params.row.engagement ? (
            <Chip
              label={formatEngagementStageLabel(params.row.engagement.stage)}
              size="small"
              sx={{ backgroundColor: "var(--color-subtle)", color: "var(--color-primary)", fontWeight: 600 }}
            />
          ) : (
            <span style={{ color: "#9CA3AF" }}>—</span>
          ),
      },
    ];
  }, [projectCreatedAt]);

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
          return formatIndustryDisplay(deal.industry);
        case "geography":
          return getGeography(deal) || "";
        case "date_received":
          return getDateReceivedSortValue(getEffectiveDateReceived(deal.date_received, projectCreatedAt));
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

      if (aValue == null && bValue == null) {
        return 0;
      }

      if (aValue == null) {
        return 1;
      }

      if (bValue == null) {
        return -1;
      }

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
  }, [projectCreatedAt, sortModel, visibleDeals]);

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
      <div className="bg-bg pt-8 border-b border-border-color">
        <div className="w-full px-5 sm:px-6">
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

          <div className="flex items-center justify-between">
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
              data-testid="project-deals-primary-tabs"
              value={viewMode}
              onChange={(_, newValue) => {
                const route = getProjectDealsRouteForTabChange(projectId, newValue);
                if (route) {
                  router.push(route);
                }
              }}
              className="-mb-px"
            >
              <Tab label="Matches" value="matches" />
              <Tab label="Active" value="active" />
              <Tab label="Archived" value="archive" />
            </PrimaryTabs>
          </div>
        </div>
      </div>

      <div className="w-full px-4 pb-8">
        <div className="pt-4">
          {visibleDeals.length === 0 ? (
            <div className="bg-surface-alt rounded-lg border border-border-color p-8 text-center text-text-secondary">
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
              onRowClick={openDealDrawer}
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

      {selectedDeal && (
        <ProjectDealDrawer
          deal={selectedDeal}
          workspaceHref={`/deals/${selectedDeal.id}`}
          onClose={closeDealDrawer}
          restoreFocusRef={drawerTriggerRef}
          actionButtons={selectedDealActions}
        />
      )}
    </main>
  );
}
