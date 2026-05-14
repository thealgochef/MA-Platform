"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { DEAL_STATUS_LABELS, INDUSTRIES, US_STATES } from "@/lib/constants";

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

export default function BrowseDealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    industry: "",
    revenueMin: "",
    revenueMax: "",
    ebitdaMin: "",
    ebitdaMax: "",
    location: "",
    keyword: "",
  });

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.revenueMin) params.set("revenueMin", filters.revenueMin);
    if (filters.revenueMax) params.set("revenueMax", filters.revenueMax);
    if (filters.ebitdaMin) params.set("ebitdaMin", filters.ebitdaMin);
    if (filters.ebitdaMax) params.set("ebitdaMax", filters.ebitdaMax);
    if (filters.location) params.set("location", filters.location);
    if (filters.keyword) params.set("keyword", filters.keyword);
    return params.toString();
  }, [filters]);

  const fetchDeals = useCallback(async (cursor?: string) => {
    const filterStr = buildFilterParams();
    const cursorParam = cursor ? `&cursor=${cursor}` : "";
    const url = `/api/browse?${filterStr}${cursorParam}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (cursor) {
        setDeals(prev => [...prev, ...data.deals]);
      } else {
        setDeals(data.deals || []);
      }
      setNextCursor(data.nextCursor);
    }
  }, [buildFilterParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchDeals();
      setLoading(false);
    };
    load();
  }, [fetchDeals]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchDeals(nextCursor);
    setLoadingMore(false);
  };

  const handlePursue = async (dealId: string) => {
    setActionLoading(dealId);
    const res = await fetch(`/api/deals/${dealId}/pursue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const { engagement } = await res.json();
      setDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, engagement } : d
      ));
    }
    setActionLoading(null);
  };

  const handleDecline = async (dealId: string) => {
    setActionLoading(dealId);
    const res = await fetch(`/api/deals/${dealId}/decline`, {
      method: "POST",
    });
    if (res.ok) {
      const { engagement } = await res.json();
      setDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, engagement } : d
      ));
    }
    setActionLoading(null);
  };

  const getGeography = (deal: Deal) => {
    return deal.geography_display === "state" ? deal.state : deal.region;
  };

  const isNotClickable = (deal: Deal) => {
    return deal.status === "closed" || deal.status === "paused";
  };

  const navigateToDeal = (dealId: string) => {
    router.push(`/deals/${dealId}`);
  };

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-primary mb-6">Browse All Deals</h1>

        {/* Filter Bar */}
        <div className="bg-surface-alt rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <select
              value={filters.industry}
              onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
              className="border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="">All Industries</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>

            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary">
              <option value="">All Locations</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <input
              type="number"
              placeholder="Revenue Min"
              value={filters.revenueMin}
              onChange={(e) => setFilters({ ...filters, revenueMin: e.target.value })}
              className="border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
            />

            <input
              type="number"
              placeholder="Revenue Max"
              value={filters.revenueMax}
              onChange={(e) => setFilters({ ...filters, revenueMax: e.target.value })}
              className="border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
            />

            <input
              type="number"
              placeholder="EBITDA Min"
              value={filters.ebitdaMin}
              onChange={(e) => setFilters({ ...filters, ebitdaMin: e.target.value })}
              className="border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
            />

            <input
              type="number"
              placeholder="EBITDA Max"
              value={filters.ebitdaMax}
              onChange={(e) => setFilters({ ...filters, ebitdaMax: e.target.value })}
              className="border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
            />

            <input
              type="text"
              placeholder="Keyword search"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              className="border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
            />
          </div>
        </div>

        {/* Deals Table */}
        {loading ? (
          <p className="text-text-secondary">Loading deals...</p>
        ) : (
          <div className="bg-surface-alt rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-gray bg-bg-alt">
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Headline</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Industry</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Geography</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">EBITDA</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const notClickable = isNotClickable(deal);
                  const isEngaged = deal.engagement && deal.engagement.stage !== "declined";
                  const isDeclined = deal.engagement?.stage === "declined";

                  return (
                    <tr
                      key={deal.id}
                      className={`border-t border-border-gray cursor-pointer hover:bg-border-gray transition-colors ${notClickable ? "opacity-60" : ""}`}
                      onClick={() => navigateToDeal(deal.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigateToDeal(deal.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open deal ${deal.headline}`}
                    >
                      <td className="px-4 py-3 font-medium text-primary hover:underline">{deal.headline}</td>
                      <td className="px-4 py-3 text-text-secondary">{deal.industry}</td>
                      <td className="px-4 py-3 text-text-secondary">{getGeography(deal) || "—"}</td>
                      <td className="px-4 py-3">{deal.revenue_year_3 != null ? formatCurrency(deal.revenue_year_3) : "—"}</td>
                      <td className="px-4 py-3">{deal.ebitda_year_3 != null ? formatCurrency(deal.ebitda_year_3) : "—"}</td>
                      <td className="px-4 py-3">
                        {deal.status === "closed" ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-border-gray text-text-secondary">Closed</span>
                        ) : deal.status === "paused" ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">Paused</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                            {DEAL_STATUS_LABELS[deal.status] || deal.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {notClickable ? (
                          <span className="text-xs text-text-secondary">—</span>
                        ) : !isEngaged && !isDeclined ? (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handlePursue(deal.id);
                              }}
                              disabled={actionLoading === deal.id}
                              className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-btn-hover disabled:opacity-50"
                            >
                              Pursue
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDecline(deal.id);
                              }}
                              disabled={actionLoading === deal.id}
                              className="px-3 py-1 bg-surface-alt border border-border-gray text-text-secondary rounded text-xs hover:bg-bg-alt disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        ) : isDeclined ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handlePursue(deal.id);
                            }}
                            disabled={actionLoading === deal.id}
                            className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-btn-hover disabled:opacity-50"
                          >
                            Pursue
                          </button>
                        ) : (
                          <span className="text-xs text-secondary capitalize">
                            {deal.engagement?.stage.replace(/_/g, " ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {deals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                      No deals found. Try adjusting your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {nextCursor && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2 bg-surface-alt border border-border-gray rounded-md text-sm hover:bg-bg-alt disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
