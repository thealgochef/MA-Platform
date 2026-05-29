"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataGridTable } from "@/components/ui/DataGridTable";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";

interface Deal {
  id: string;
  project_name: string;
  headline: string;
  status: string;
  industry: string;
  view_count: number;
  published_at: string | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
}

const DEAL_STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: "bg-warning/10 text-warning",
  paused: "bg-warning/10 text-warning",
  terminated: "bg-error/10 text-error",
  closed: "bg-text-secondary/10 text-text-secondary",
};

const DEFAULT_DEAL_STATUS_BADGE_CLASS = "bg-success/10 text-success";

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
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

    const fetchDeals = async () => {
      try {
        const res = await fetch("/api/deals", { signal: abortController.signal });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const dealsPayload = data?.deals;
            setDeals(Array.isArray(dealsPayload) ? dealsPayload : []);
          }
        } else {
          if (isMounted) {
            setError("Failed to load deals.");
          }
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

    fetchDeals();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const columns = useMemo<GridColDef<Deal>[]>(() => {
    return [
      {
        field: "project_name",
        headerName: "Project Name",
        flex: 1.2,
        minWidth: 180,
        cellClassName: "font-bold text-primary",
        renderCell: (params) => (
          <Link
            href={`/deals/${params.row.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            {params.row.project_name}
          </Link>
        ),
      },
      {
        field: "headline",
        headerName: "Headline",
        flex: 1.5,
        minWidth: 220,
        cellClassName: "text-text-secondary row-hover-text",
      },
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 140,
        cellClassName: "text-text-secondary row-hover-text",
      },
      {
        field: "revenue",
        headerName: "Revenue",
        flex: 1,
        minWidth: 140,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => row.revenue_year_3 ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) => {
          const revenue = params.row.revenue_year_3;
          return revenue != null ? formatCurrency(revenue) + "M": "—";
        },
      },
      {
        field: "ebitda",
        headerName: "EBITDA",
        flex: 1,
        minWidth: 140,
        cellClassName: "row-hover-text",
        valueGetter: (_, row) => row.ebitda_year_3 ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) => {
          const ebitda = params.row.ebitda_year_3;
          return ebitda != null ? formatCurrency(ebitda) + "M": "—";
        },
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 130,
        renderCell: (params) => {
          const status = params.row.status;
          const statusLabel = DEAL_STATUS_LABELS[status] || status;
          const statusClassName = DEAL_STATUS_BADGE_CLASSES[status] || DEFAULT_DEAL_STATUS_BADGE_CLASS;

          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClassName}`}>
              {statusLabel}
            </span>
          );
        },
      },
      {
        field: "view_count",
        headerName: "Views",
        flex: 0.8,
        minWidth: 90,
        cellClassName: "text-text-secondary row-hover-text",
      },
    ];
  }, []);

  const filteredDeals = useMemo(
    () => (filter === "all" ? deals : deals.filter((deal) => deal.status === filter)),
    [deals, filter]
  );

  const sortedFilteredDeals = useMemo(() => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort.sort) {
      return filteredDeals;
    }

    const direction = activeSort.sort === "asc" ? 1 : -1;
    const getValue = (deal: Deal) => {
      switch (activeSort.field) {
        case "project_name":
          return deal.project_name;
        case "headline":
          return deal.headline;
        case "industry":
          return deal.industry;
        case "revenue":
          return deal.revenue_year_3 ?? Number.NEGATIVE_INFINITY;
        case "ebitda":
          return deal.ebitda_year_3 ?? Number.NEGATIVE_INFINITY;
        case "status":
          return DEAL_STATUS_LABELS[deal.status] || deal.status;
        case "view_count":
          return deal.view_count;
        default:
          return "";
      }
    };

    return [...filteredDeals].sort((a, b) => {
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
  }, [filteredDeals, sortModel]);

  const pagedDeals = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return sortedFilteredDeals.slice(start, start + paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize, sortedFilteredDeals]);

  const { statuses, statusCounts } = useMemo(() => {
    const counts = new Map<string, number>();

    for (const deal of deals) {
      counts.set(deal.status, (counts.get(deal.status) ?? 0) + 1);
    }

    return {
      statuses: Array.from(counts.keys()),
      statusCounts: counts,
    };
  }, [deals]);

  const handleSortModelChange = (model: GridSortModel) => {
    setSortModel(model);
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  };

  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [filter]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedFilteredDeals.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({ ...prev, page: maxPage }));
    }
  }, [paginationModel.page, paginationModel.pageSize, sortedFilteredDeals.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading deals...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">My Deals</h1>
          <Link
            href="/deals/new"
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
          >
            New Deal
          </Link>
        </div>

        {error && (
          <div className="bg-error/10 border border-error rounded-md p-4 mb-6">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Filter bar */}
        {deals.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-primary text-white"
                  : "bg-surface-alt text-text-secondary border border-border-gray hover:bg-bg-alt"
              }`}
            >
              All ({deals.length})
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === s
                    ? "bg-primary text-white"
                    : "bg-surface-alt text-text-secondary border border-border-gray hover:bg-bg-alt"
                }`}
              >
                {DEAL_STATUS_LABELS[s] || s} ({statusCounts.get(s) ?? 0})
              </button>
            ))}
          </div>
        )}

        {deals.length === 0 ? (
          <div className="bg-surface-alt rounded-lg shadow-md p-8 text-center">
            <p className="text-text-secondary mb-4">You haven&apos;t created any deals yet.</p>
            <Link
              href="/deals/new"
              className="inline-block px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
            >
              Create Your First Deal
            </Link>
          </div>
        ) : (
          <DataGridTable
            rows={pagedDeals}
            detailColumns={columns}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={setRowSelectionModel}
            sortModel={sortModel}
            onSortModelChange={handleSortModelChange}
            onRowClick={(row) => router.push(`/deals/${row.id}`)}
            sortedCount={sortedFilteredDeals.length}
            paginationModel={paginationModel}
            onPageChange={(page) => setPaginationModel((prev) => ({ ...prev, page }))}
            onRowsPerPageChange={(pageSize) => setPaginationModel({ page: 0, pageSize })}
          />
        )}
      </div>
    </div>
  );
}
