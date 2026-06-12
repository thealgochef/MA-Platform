"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataGridTable } from "@/components/ui/DataGridTable";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatIndustryDisplay } from "@/lib/utils";
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

export default function BrokerDashboard() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
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

    const fetchDeals = async () => {
      try {
        const res = await fetch("/api/deals", { signal: abortController.signal });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setDeals(data.deals || []);
          }
        } else {
          if (isMounted) {
            setError("Failed to load deals.");
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
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

  const handleSortModelChange = (model: GridSortModel) => {
    setSortModel(model);
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  };

  // Preserve legacy KPI behavior from pre-DataGrid dashboard: "Active Deals" intentionally
  // means "not closed/terminated" and therefore includes drafts.
  const activeDeals = deals.filter(d => !["terminated", "closed", "draft"].includes(d.status));
  const closedDeals = deals.filter(d => d.status === "closed");
  const draftDeals = deals.filter(d => d.status === "draft");

  const columns = useMemo<GridColDef<Deal>[]>(() => {
    return [
      {
        field: "project_name",
        headerName: "Project Name",
        flex: 1.2,
        minWidth: 180,
        cellClassName: "font-bold text-primary",
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
        valueGetter: (_, row) => formatIndustryDisplay(row.industry),
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
          const statusLabel = DEAL_STATUS_LABELS[status] ?? status ?? "Unknown";
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                status === "draft" ? "bg-warning/10 text-warning" :
                status === "paused" ? "bg-warning/10 text-warning" :
                status === "terminated" ? "bg-error/10 text-error" :
                status === "closed" ? "bg-text-secondary/10 text-text-secondary" :
                "bg-success/10 text-success"
              }`}
            >
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

  const sortedDeals = useMemo(() => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort.sort) {
      return deals;
    }

    const direction = activeSort.sort === "asc" ? 1 : -1;
    const getValue = (deal: Deal) => {
      switch (activeSort.field) {
        case "project_name":
          return deal.project_name;
        case "headline":
          return deal.headline;
        case "industry":
          return formatIndustryDisplay(deal.industry);
        case "revenue":
          return deal.revenue_year_3 ?? Number.NEGATIVE_INFINITY;
        case "status":
          return DEAL_STATUS_LABELS[deal.status] ?? deal.status;
        case "view_count":
          return deal.view_count;
        default:
          return "";
      }
    };

    return [...deals].sort((a, b) => {
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
  }, [deals, sortModel]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedDeals.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({ ...prev, page: maxPage }));
    }
  }, [paginationModel.page, paginationModel.pageSize, sortedDeals.length]);

  const pagedDeals = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return sortedDeals.slice(start, start + paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize, sortedDeals]);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
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
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-error underline mt-1"
            >
              Retry
            </button>
          </div>
        )}

        {/* Analytics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-alt rounded-lg border border-border-color p-4">
            <p className="text-xs text-text-secondary">Total Deals</p>
            <p className="text-2xl font-bold text-primary">{deals.length}</p>
          </div>
          <div className="bg-surface-alt rounded-lg border border-border-color p-4">
            <p className="text-xs text-text-secondary">Active Deals</p>
            <p className="text-2xl font-bold text-primary">{activeDeals.length}</p>
          </div>
          <div className="bg-surface-alt rounded-lg border border-border-color p-4">
            <p className="text-xs text-text-secondary">Drafts</p>
            <p className="text-2xl font-bold text-primary">{draftDeals.length}</p>
          </div>
          <div className="bg-surface-alt rounded-lg border border-border-color p-4">
            <p className="text-xs text-text-secondary">Closed</p>
            <p className="text-2xl font-bold text-primary">{closedDeals.length}</p>
          </div>
        </div>

        {/* Deal List */}
        <h2 className="text-lg font-semibold text-primary mb-4">Your Deals</h2>

        {deals.length === 0 ? (
          <div className="bg-surface-alt rounded-lg border border-border-color p-8 text-center">
            <p className="text-text-secondary mb-4">Post your first deal</p>
            <Link
              href="/deals/new"
              className="inline-block px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
            >
              Create Deal
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
            sortedCount={sortedDeals.length}
            paginationModel={paginationModel}
            onPageChange={(page) => setPaginationModel((prev) => ({ ...prev, page }))}
            onRowsPerPageChange={(pageSize) => setPaginationModel({ page: 0, pageSize })}
          />
        )}
      </div>
    </main>
  );
}
