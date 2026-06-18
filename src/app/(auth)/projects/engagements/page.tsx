"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable } from "@/components/ui/DataGridTable";
import { ProjectDealDrawer, type ProjectDealDrawerDeal } from "@/components/buyer/ProjectDealDrawer";
import { getBuyerDealActions } from "@/lib/buyer-deal-actions";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatEngagementStageLabel } from "@/lib/engagement-stage-labels";
import { formatCurrency, formatIndustryDisplay } from "@/lib/utils";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";
import { Chip } from "@mui/material";

interface EngagementRow {
  id: string;
  stage: string;
  nda_status: string;
  created_at: string;
  updated_at: string | null;
  project_id: string | null;
  project_name: string | null;
  deal: {
    id: string;
    headline: string;
    description: string | null;
    industry: string;
    state: string | null;
    region: string | null;
    geography_display: string | null;
    status: string;
    revenue_year_1: number | null;
    ebitda_year_1: number | null;
    revenue_year_2: number | null;
    ebitda_year_2: number | null;
    geography: string | null;
    revenue_year_3: number | null;
    ebitda_year_3: number | null;
    revenue_projection: number | null;
    ebitda_projection: number | null;
    fiscal_year_labels: Record<string, string> | null;
    nda_type: string | null;
    cim_sharing_preference: string | null;
    nda_vetting_preference: string | null;
    has_teaser_document: boolean;
    has_cim_document: boolean;
    has_nda_document: boolean;
    ioi_due_date: string | null;
    loi_due_date: string | null;
    published_at: string | null;
    closed_at: string | null;
    created_at: string;
    date_received: string;
  };
  engagement: {
    id: string;
    stage: string;
    nda_status: string;
    nda_signed_at: string | null;
    cim_released: boolean | null;
    cim_released_at: string | null;
    cim_viewed_at: string | null;
    cim_downloaded_at: string | null;
    pass_reason: string | null;
    pass_reason_detail: string | null;
    declined_at: string | null;
    vetting_status: string | null;
    vetting_rejection_reason: string | null;
    date_received: string | null;
  };
}

interface EngagementTableRow {
  id: string;
  deal_id: string;
  deal_headline: string;
  project_name: string | null;
  stage: string;
  deal_status: string;
  industry: string;
  geography: string | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  last_updated: string;
  engagement: {
    stage: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isNullableBoolean(value: unknown): value is boolean | null {
  return value === null || typeof value === "boolean";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}

function isValidEngagementDeal(value: unknown): value is EngagementRow["deal"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.headline === "string" &&
    isNullableString(value.description) &&
    typeof value.industry === "string" &&
    isNullableString(value.state) &&
    isNullableString(value.region) &&
    isNullableString(value.geography_display) &&
    typeof value.status === "string" &&
    isNullableNumber(value.revenue_year_1) &&
    isNullableNumber(value.ebitda_year_1) &&
    isNullableNumber(value.revenue_year_2) &&
    isNullableNumber(value.ebitda_year_2) &&
    isNullableString(value.geography) &&
    isNullableNumber(value.revenue_year_3) &&
    isNullableNumber(value.ebitda_year_3) &&
    isNullableNumber(value.revenue_projection) &&
    isNullableNumber(value.ebitda_projection) &&
    (value.fiscal_year_labels === null || isStringRecord(value.fiscal_year_labels)) &&
    isNullableString(value.nda_type) &&
    isNullableString(value.cim_sharing_preference) &&
    isNullableString(value.nda_vetting_preference) &&
    typeof value.has_teaser_document === "boolean" &&
    typeof value.has_cim_document === "boolean" &&
    typeof value.has_nda_document === "boolean" &&
    isNullableString(value.ioi_due_date) &&
    isNullableString(value.loi_due_date) &&
    isNullableString(value.published_at) &&
    isNullableString(value.closed_at) &&
    typeof value.created_at === "string" &&
    typeof value.date_received === "string"
  );
}

function isValidEngagementDetails(value: unknown): value is EngagementRow["engagement"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.stage === "string" &&
    typeof value.nda_status === "string" &&
    isNullableString(value.nda_signed_at) &&
    isNullableBoolean(value.cim_released) &&
    isNullableString(value.cim_released_at) &&
    isNullableString(value.cim_viewed_at) &&
    isNullableString(value.cim_downloaded_at) &&
    isNullableString(value.pass_reason) &&
    isNullableString(value.pass_reason_detail) &&
    isNullableString(value.declined_at) &&
    isNullableString(value.vetting_status) &&
    isNullableString(value.vetting_rejection_reason) &&
    isNullableString(value.date_received)
  );
}

function isValidEngagementRow(value: unknown): value is EngagementRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.stage === "string" &&
    typeof value.nda_status === "string" &&
    typeof value.created_at === "string" &&
    isNullableString(value.updated_at) &&
    isNullableString(value.project_id) &&
    isNullableString(value.project_name) &&
    isValidEngagementDetails(value.engagement) &&
    isValidEngagementDeal(value.deal)
  );
}

function isValidViewer(value: unknown): value is { isApprovedBuyer: boolean } {
  return isRecord(value) && typeof value.isApprovedBuyer === "boolean";
}

const ALL_INDUSTRIES_FILTER = "__ALL_INDUSTRIES__" as const;

type IndustryFilter = typeof ALL_INDUSTRIES_FILTER | string;

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

function parseValidDate(value: string): Date | null {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function mapEngagementToDrawerDeal(engagement: EngagementRow): ProjectDealDrawerDeal {
  return {
    id: engagement.deal.id,
    headline: engagement.deal.headline,
    description: engagement.deal.description,
    industry: engagement.deal.industry,
    state: engagement.deal.state,
    region: engagement.deal.region,
    geography_display: engagement.deal.geography_display,
    status: engagement.deal.status,
    revenue_year_1: engagement.deal.revenue_year_1,
    ebitda_year_1: engagement.deal.ebitda_year_1,
    revenue_year_2: engagement.deal.revenue_year_2,
    ebitda_year_2: engagement.deal.ebitda_year_2,
    revenue_year_3: engagement.deal.revenue_year_3,
    ebitda_year_3: engagement.deal.ebitda_year_3,
    revenue_projection: engagement.deal.revenue_projection,
    ebitda_projection: engagement.deal.ebitda_projection,
    fiscal_year_labels: engagement.deal.fiscal_year_labels,
    nda_type: engagement.deal.nda_type,
    cim_sharing_preference: engagement.deal.cim_sharing_preference,
    nda_vetting_preference: engagement.deal.nda_vetting_preference,
    has_teaser_document: engagement.deal.has_teaser_document,
    has_cim_document: engagement.deal.has_cim_document,
    has_nda_document: engagement.deal.has_nda_document,
    ioi_due_date: engagement.deal.ioi_due_date,
    loi_due_date: engagement.deal.loi_due_date,
    published_at: engagement.deal.published_at,
    closed_at: engagement.deal.closed_at,
    engagement: {
      id: engagement.engagement.id,
      stage: engagement.engagement.stage,
      nda_status: engagement.engagement.nda_status,
      nda_signed_at: engagement.engagement.nda_signed_at,
      cim_released: engagement.engagement.cim_released,
      cim_released_at: engagement.engagement.cim_released_at,
      cim_viewed_at: engagement.engagement.cim_viewed_at,
      cim_downloaded_at: engagement.engagement.cim_downloaded_at,
      pass_reason: engagement.engagement.pass_reason,
      pass_reason_detail: engagement.engagement.pass_reason_detail,
      declined_at: engagement.engagement.declined_at,
      vetting_status: engagement.engagement.vetting_status,
      vetting_rejection_reason: engagement.engagement.vetting_rejection_reason,
      date_received: engagement.engagement.date_received ?? engagement.deal.date_received,
    },
  };
}

function getDealGeography(deal: EngagementRow["deal"]): string | null {
  if (deal.geography) {
    return deal.geography;
  }

  return deal.geography_display === "state" ? deal.state : deal.region;
}

export default function BuyerEngagementsPage() {
  const router = useRouter();
  const [engagements, setEngagements] = useState<EngagementRow[]>([]);
  const [isApprovedBuyer, setIsApprovedBuyer] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>(ALL_INDUSTRIES_FILTER);
  const [showIndustryFilters, setShowIndustryFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingDealId, setActionLoadingDealId] = useState<string | null>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchEngagements = async () => {
      try {
        const res = await fetch("/api/buyer/engagements", { signal: abortController.signal });
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          const rawEngagements = Array.isArray(data?.engagements) ? data.engagements : [];
          const validEngagements = rawEngagements.filter(isValidEngagementRow);
          const viewer = isValidViewer(data?.viewer) ? data.viewer : null;

          if (validEngagements.length !== rawEngagements.length) {
            console.warn(
              `[BuyerEngagementsPage] Ignored ${rawEngagements.length - validEngagements.length} malformed engagement record(s).`
            );
          }

          if (!viewer) {
            console.warn("[BuyerEngagementsPage] Missing or malformed viewer payload; defaulting to unapproved buyer.");
          }

          setEngagements(validEngagements);
          setIsApprovedBuyer(viewer?.isApprovedBuyer ?? false);
        } else {
          setError("Failed to load engaged deals.");
        }
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setError("Network error. Please try again.");
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchEngagements();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const rows = useMemo<EngagementTableRow[]>(() => {
    return engagements.map((engagement) => ({
      id: engagement.id,
      deal_id: engagement.deal.id,
      deal_headline: engagement.deal.headline,
      project_name: engagement.project_name,
      stage: engagement.stage,
      deal_status: engagement.deal.status,
      industry: engagement.deal.industry,
      geography: getDealGeography(engagement.deal),
      revenue_year_3: engagement.deal.revenue_year_3,
      ebitda_year_3: engagement.deal.ebitda_year_3,
      last_updated: engagement.updated_at ?? engagement.created_at,
      engagement: {
        stage: engagement.stage,
      },
    }));
  }, [engagements]);

  const columns = useMemo<GridColDef<EngagementTableRow>[]>(() => {
    return [
      {
        field: "deal_headline",
        headerName: "Deal Headline",
        flex: 1.4,
        minWidth: 220,
        cellClassName: "font-bold text-primary row-hover-text",
      },
      {
        field: "project_name",
        headerName: "Project",
        flex: 1,
        minWidth: 160,
        valueGetter: (_, row) => row.project_name || "—",
        cellClassName: "row-hover-text",
      },
      {
        field: "stage",
        headerName: "Engagement Stage",
        flex: 1,
        minWidth: 170,
        renderCell: (params) => (
          <Chip
            label={formatEngagementStageLabel(params.row.stage)}
            size="small"
            sx={{ backgroundColor: "var(--color-subtle)", color: "var(--color-primary)", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "deal_status",
        headerName: "Deal Status",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
          <Chip
            label={DEAL_STATUS_LABELS[params.row.deal_status] || params.row.deal_status}
            size="small"
            sx={{ backgroundColor: "#10B9811A", color: "#10B981", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 140,
        valueGetter: (_, row) => formatIndustryDisplay(row.industry),
        cellClassName: "row-hover-text",
      },
      {
        field: "geography",
        headerName: "Geography",
        flex: 1,
        minWidth: 130,
        valueGetter: (_, row) => row.geography || "—",
        cellClassName: "row-hover-text",
      },
      {
        field: "revenue_year_3",
        headerName: "Revenue",
        flex: 0.9,
        minWidth: 130,
        valueGetter: (_, row) => row.revenue_year_3 ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) =>
          params.row.revenue_year_3 != null ? `${formatCurrency(params.row.revenue_year_3)}M` : "—",
        cellClassName: "row-hover-text",
      },
      {
        field: "ebitda_year_3",
        headerName: "EBITDA",
        flex: 0.9,
        minWidth: 130,
        valueGetter: (_, row) => row.ebitda_year_3 ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) =>
          params.row.ebitda_year_3 != null ? `${formatCurrency(params.row.ebitda_year_3)}M` : "—",
        cellClassName: "row-hover-text",
      },
      {
        field: "last_updated",
        headerName: "Last Updated",
        flex: 0.9,
        minWidth: 130,
        valueGetter: (_, row) => {
          const parsedDate = parseValidDate(row.last_updated);
          return parsedDate ? parsedDate.getTime() : Number.NEGATIVE_INFINITY;
        },
        renderCell: (params) => {
          const parsedDate = parseValidDate(params.row.last_updated);
          return parsedDate ? DATE_DISPLAY_FORMATTER.format(parsedDate) : "—";
        },
        cellClassName: "row-hover-text",
      },
    ];
  }, []);

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
    });

    return counts;
  }, [rows]);

  const stages = useMemo(() => Array.from(stageCounts.keys()), [stageCounts]);

  const stageFilteredRows = useMemo(() => {
    if (stageFilter === "all") {
      return rows;
    }

    return rows.filter((row) => row.stage === stageFilter);
  }, [rows, stageFilter]);

  const industryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    stageFilteredRows.forEach((row) => {
      counts.set(row.industry, (counts.get(row.industry) ?? 0) + 1);
    });

    return counts;
  }, [stageFilteredRows]);

  const industries = useMemo(() => Array.from(industryCounts.keys()), [industryCounts]);

  useEffect(() => {
    if (industryFilter === ALL_INDUSTRIES_FILTER) {
      return;
    }

    if (!industries.includes(industryFilter)) {
      setIndustryFilter(ALL_INDUSTRIES_FILTER);
    }
  }, [industries, industryFilter]);

  const filteredRows = useMemo(() => {
    if (industryFilter === ALL_INDUSTRIES_FILTER) {
      return stageFilteredRows;
    }

    return stageFilteredRows.filter((row) => row.industry === industryFilter);
  }, [industryFilter, stageFilteredRows]);

  const sortedRows = useMemo(() => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort.sort) {
      return filteredRows;
    }

    const direction = activeSort.sort === "asc" ? 1 : -1;
    const getValue = (row: EngagementTableRow) => {
      switch (activeSort.field) {
        case "deal_headline":
          return row.deal_headline;
        case "project_name":
          return row.project_name || "";
        case "stage":
          return formatEngagementStageLabel(row.stage);
        case "deal_status":
          return DEAL_STATUS_LABELS[row.deal_status] || row.deal_status;
        case "industry":
          return formatIndustryDisplay(row.industry);
        case "geography":
          return row.geography || "";
        case "revenue_year_3":
          return row.revenue_year_3 ?? Number.NEGATIVE_INFINITY;
        case "ebitda_year_3":
          return row.ebitda_year_3 ?? Number.NEGATIVE_INFINITY;
        case "last_updated":
          return parseValidDate(row.last_updated)?.getTime() ?? Number.NEGATIVE_INFINITY;
        default:
          return "";
      }
    };

    return [...filteredRows].sort((a, b) => {
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
  }, [filteredRows, sortModel]);

  const handleSortModelChange = (model: GridSortModel) => {
    setSortModel(model);
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  };

  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [industryFilter, stageFilter]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedRows.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({ ...prev, page: maxPage }));
    }
  }, [paginationModel.page, paginationModel.pageSize, sortedRows.length]);

  const pagedRows = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return sortedRows.slice(start, start + paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize, sortedRows]);

  const selectedEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === selectedEngagementId) ?? null,
    [engagements, selectedEngagementId]
  );

  const selectedDealForDrawer = useMemo(
    () => (selectedEngagement ? mapEngagementToDrawerDeal(selectedEngagement) : null),
    [selectedEngagement]
  );

  const updateEngagementState = useCallback(
    (dealId: string, updatedEngagement: EngagementRow["engagement"]) => {
      setEngagements((prev) =>
        prev.map((engagement) => {
          if (engagement.deal.id !== dealId) {
            return engagement;
          }

          return {
            ...engagement,
            stage: updatedEngagement.stage,
            nda_status: updatedEngagement.nda_status,
            updated_at: new Date().toISOString(),
            engagement: updatedEngagement,
          };
        })
      );
    },
    []
  );

  const handlePursue = useCallback(
    async (dealId: string) => {
      setActionLoadingDealId(dealId);

      try {
        const matchingEngagement = engagements.find((engagement) => engagement.deal.id === dealId);
        const projectId = matchingEngagement?.project_id;
        const encodedDealId = encodeURIComponent(dealId);
        const requestOptions: RequestInit = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          ...(projectId ? { body: JSON.stringify({ projectId }) } : {}),
        };

        const res = await fetch(`/api/deals/${encodedDealId}/pursue`, requestOptions);
        if (!res.ok) {
          setError("Failed to update deal engagement. Please try again.");
          return;
        }

        const data: unknown = await res.json();
        const engagementPayload =
          isRecord(data) && "engagement" in data ? data.engagement : null;

        if (!isValidEngagementDetails(engagementPayload)) {
          console.warn("[BuyerEngagementsPage] Received malformed engagement payload from pursue endpoint.");
          return;
        }

        updateEngagementState(dealId, engagementPayload);
      } catch (requestError) {
        console.error("[BuyerEngagementsPage] Failed to pursue deal.", requestError);
        setError("Failed to update deal engagement. Please try again.");
      } finally {
        setActionLoadingDealId(null);
      }
    },
    [engagements, updateEngagementState]
  );

  const handleDecline = useCallback(
    async (dealId: string) => {
      setActionLoadingDealId(dealId);

      try {
        const encodedDealId = encodeURIComponent(dealId);
        const res = await fetch(`/api/deals/${encodedDealId}/decline`, {
          method: "POST",
        });

        if (!res.ok) {
          setError("Failed to update deal engagement. Please try again.");
          return;
        }

        const data: unknown = await res.json();
        const engagementPayload =
          isRecord(data) && "engagement" in data ? data.engagement : null;

        if (!isValidEngagementDetails(engagementPayload)) {
          console.warn("[BuyerEngagementsPage] Received malformed engagement payload from decline endpoint.");
          return;
        }

        updateEngagementState(dealId, engagementPayload);
      } catch (requestError) {
        console.error("[BuyerEngagementsPage] Failed to decline deal.", requestError);
        setError("Failed to update deal engagement. Please try again.");
      } finally {
        setActionLoadingDealId(null);
      }
    },
    [updateEngagementState]
  );

  const selectedDealActions = useMemo(() => {
    if (!selectedDealForDrawer) {
      return [];
    }

    return getBuyerDealActions(selectedDealForDrawer, {
      onNavigate: (href) => router.push(href),
      onPursue: (dealId) => void handlePursue(dealId),
      onDecline: (dealId) => void handleDecline(dealId),
      actionLoadingDealId,
      isApprovedBuyer,
    });
  }, [actionLoadingDealId, handleDecline, handlePursue, isApprovedBuyer, router, selectedDealForDrawer]);

  const handleOpenDealDrawer = useCallback((row: EngagementTableRow) => {
    drawerTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedEngagementId(row.id);
  }, []);

  const handleCloseDealDrawer = useCallback(() => {
    setSelectedEngagementId(null);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading engaged deals...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="w-full px-5 sm:px-6">
        <h1 className="text-2xl font-bold text-primary">Deals Pursued</h1>
        <p className="text-sm text-text-secondary mb-4">
          A consolidated view of all deals you&apos;ve engaged with.
        </p>

        {error && (
          <div className="bg-error/10 border border-error rounded-md p-4 mb-6">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setStageFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                stageFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-surface-alt text-text-secondary border border-border-gray hover:bg-bg-alt"
              }`}
            >
              All ({rows.length})
            </button>
            {stages.map((stage) => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  stageFilter === stage
                    ? "bg-primary text-white"
                    : "bg-surface-alt text-text-secondary border border-border-gray hover:bg-bg-alt"
                }`}
              >
                {formatEngagementStageLabel(stage)} ({stageCounts.get(stage) ?? 0})
              </button>
            ))}
            <button
                onClick={() => setShowIndustryFilters((prev) => !prev)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                showIndustryFilters || industryFilter !== ALL_INDUSTRIES_FILTER
                  ? "bg-primary text-white"
                  : "bg-surface-alt text-text-secondary border border-border-gray hover:bg-bg-alt"
              }`}
            >
              Industry
            </button>
            {showIndustryFilters && (
              <>
                <button
                  onClick={() => setIndustryFilter(ALL_INDUSTRIES_FILTER)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    industryFilter === ALL_INDUSTRIES_FILTER
                      ? "bg-primary text-white"
                      : "bg-surface-alt text-text-secondary border border-border-gray hover:bg-bg-alt"
                  }`}
                >
                  All Industries ({stageFilteredRows.length})
                </button>
                {industries.map((industry) => (
                  <button
                    key={industry}
                    onClick={() => setIndustryFilter(industry)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      industryFilter === industry
                        ? "bg-primary text-white"
                        : "bg-surface-alt text-text-secondary border border-border-gray hover:bg-bg-alt"
                    }`}
                  >
                    {formatIndustryDisplay(industry)} ({industryCounts.get(industry) ?? 0})
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="w-full px-4 pb-8">
        {rows.length === 0 ? (
          <div className="bg-surface-alt rounded-lg border border-border-color p-8 text-center text-text-secondary">
            You haven&apos;t engaged with any deals yet.
          </div>
        ) : (
          <DataGridTable
            rows={pagedRows}
            detailColumns={columns}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={setRowSelectionModel}
            sortModel={sortModel}
            onSortModelChange={handleSortModelChange}
            onRowClick={handleOpenDealDrawer}
            sortedCount={sortedRows.length}
            paginationModel={paginationModel}
            onPageChange={(page) => setPaginationModel((prev) => ({ ...prev, page }))}
            onRowsPerPageChange={(pageSize) => setPaginationModel({ page: 0, pageSize })}
          />
        )}
      </div>

      {selectedDealForDrawer && (
        <ProjectDealDrawer
          deal={selectedDealForDrawer}
          workspaceHref={`/deals/${encodeURIComponent(selectedDealForDrawer.id)}`}
          onClose={handleCloseDealDrawer}
          restoreFocusRef={drawerTriggerRef}
          actionButtons={selectedDealActions}
        />
      )}
    </main>
  );
}
