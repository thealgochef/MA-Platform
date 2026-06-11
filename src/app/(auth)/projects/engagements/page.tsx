"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable } from "@/components/ui/DataGridTable";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatEngagementStageLabel } from "@/lib/engagement-stage-labels";
import { formatCurrency } from "@/lib/utils";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";

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
    industry: string;
    status: string;
    geography: string | null;
    geography_display: string | null;
    revenue_year_3: number | null;
    ebitda_year_3: number | null;
    published_at: string | null;
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

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

function parseValidDate(value: string): Date | null {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export default function BuyerEngagementsPage() {
  const router = useRouter();
  const [engagements, setEngagements] = useState<EngagementRow[]>([]);
  const [stageFilter, setStageFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    let isMounted = true;
    const abortController = new AbortController();

    const fetchEngagements = async () => {
      try {
        const res = await fetch("/api/buyer/engagements", { signal: abortController.signal });
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          setEngagements(Array.isArray(data?.engagements) ? data.engagements : []);
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
      geography: engagement.deal.geography,
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
        valueGetter: (_, row) => formatEngagementStageLabel(row.stage),
        cellClassName: "row-hover-text",
      },
      {
        field: "deal_status",
        headerName: "Deal Status",
        flex: 1,
        minWidth: 150,
        valueGetter: (_, row) => DEAL_STATUS_LABELS[row.deal_status] || row.deal_status,
        cellClassName: "row-hover-text",
      },
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 140,
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

  const filteredRows = useMemo(() => {
    if (stageFilter === "all") {
      return rows;
    }

    return rows.filter((row) => row.stage === stageFilter);
  }, [rows, stageFilter]);

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
          return row.industry;
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
  }, [stageFilter]);

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
            onRowClick={(row) => router.push(`/deals/${encodeURIComponent(row.deal_id)}`)}
            sortedCount={sortedRows.length}
            paginationModel={paginationModel}
            onPageChange={(page) => setPaginationModel((prev) => ({ ...prev, page }))}
            onRowsPerPageChange={(pageSize) => setPaginationModel({ page: 0, pageSize })}
          />
        )}
      </div>
    </main>
  );
}
