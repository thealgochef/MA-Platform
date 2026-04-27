"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { DEAL_STATUS_LABELS } from "@/lib/constants";

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

export default function ProjectDealFeedPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeals = useCallback(async (cursor?: string) => {
    const url = `/api/projects/${projectId}/matches${cursor ? `?cursor=${cursor}` : ""}`;
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
  }, [projectId]);

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
    loadData();
  }, [projectId, fetchDeals]);

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
      body: JSON.stringify({ projectId }),
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

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading deals...</p>
      </main>
    );
  }

  const getGeography = (deal: Deal) => {
    return deal.geography_display === "state" ? deal.state : deal.region;
  };

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">{project?.name || "Project"}</h1>
            <p className="text-sm text-text-secondary">
              {deals.length} matched deal{deals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`/projects/${projectId}/edit`} className="px-3 py-1 bg-surface-alt border border-border-gray text-text rounded-md text-sm hover:bg-bg-alt">Edit</a>
            <a href="/dashboard" className="text-sm text-secondary hover:underline self-center">Dashboard</a>
          </div>
        </div>

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
                const isEngaged = deal.engagement && deal.engagement.stage !== "declined";
                const isDeclined = deal.engagement?.stage === "declined";

                return (
                  <tr key={deal.id} className={`border-t border-border-gray ${isDeclined ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 font-medium text-primary">{deal.headline}</td>
                    <td className="px-4 py-3 text-text-secondary">{deal.industry}</td>
                    <td className="px-4 py-3 text-text-secondary">{getGeography(deal) || "—"}</td>
                    <td className="px-4 py-3">{deal.revenue_year_3 != null ? formatCurrency(deal.revenue_year_3) : "—"}</td>
                    <td className="px-4 py-3">{deal.ebitda_year_3 != null ? formatCurrency(deal.ebitda_year_3) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        {DEAL_STATUS_LABELS[deal.status] || deal.status}
                      </span>
                      {deal.engagement && (
                        <span className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary capitalize">
                          {deal.engagement.stage.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isEngaged && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePursue(deal.id)}
                            disabled={actionLoading === deal.id}
                            className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-btn-hover disabled:opacity-50"
                          >
                            Pursue
                          </button>
                          <button
                            onClick={() => handleDecline(deal.id)}
                            disabled={actionLoading === deal.id}
                            className="px-3 py-1 bg-surface-alt border border-border-gray text-text-secondary rounded text-xs hover:bg-bg-alt disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {isDeclined && (
                        <button
                          onClick={() => handlePursue(deal.id)}
                          disabled={actionLoading === deal.id}
                          className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-btn-hover disabled:opacity-50"
                        >
                          Pursue
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                    No matching deals found. Try adjusting your project criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
