"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

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

function getToolbarLinkClass(isActive: boolean): string {
  return [
    "px-3 py-1 border rounded-2xl text-sm transition-colors",
    isActive
      ? "bg-primary border-primary text-white"
      : "bg-surface-alt border-border-gray text-text hover:text-bg-alt hover:bg-primary hover:border-primary",
  ].join(" ");
}

export default function ProjectDealsView({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewMode = getViewModeFromPath(pathname);
  const shouldShowSavedBanner = viewMode === "matches" && searchParams.get("saved") === "1";
  const [project, setProject] = useState<Project | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSavedBanner, setShowSavedBanner] = useState(shouldShowSavedBanner);

  useEffect(() => {
    setShowSavedBanner(shouldShowSavedBanner);

    if (!shouldShowSavedBanner) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSavedBanner(false);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shouldShowSavedBanner]);

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

  const handlePursue = async (dealId: string) => {
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
  };

  const handleDecline = async (dealId: string) => {
    setActionLoading(dealId);
    const res = await fetch(`/api/deals/${dealId}/decline`, {
      method: "POST",
    });
    if (res.ok) {
      const { engagement } = await res.json();
      setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, engagement } : deal)));
    }
    setActionLoading(null);
  };

  const getGeography = (deal: Deal) => {
    return deal.geography_display === "state" ? deal.state : deal.region;
  };

  const navigateToDeal = (dealId: string) => {
    router.push(`/deals/${dealId}`);
  };

  const visibleDeals = getVisibleDeals(deals, viewMode);
  const emptyStateMessage = getEmptyStateMessage(viewMode);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading deals...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
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
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">{project?.name || "Project"}</h1>
            <p className="text-sm text-text-secondary">
              {visibleDeals.length} {viewMode === "matches" ? "matched" : viewMode} deal
              {visibleDeals.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Link href={`/projects/${projectId}`} className={getToolbarLinkClass(viewMode === "matches")}>
              Matches
            </Link>
            <Link href={`/projects/${projectId}/active`} className={getToolbarLinkClass(viewMode === "active")}>
              Active
            </Link>
            <Link href={`/projects/${projectId}/archive`} className={getToolbarLinkClass(viewMode === "archive")}>
              Archive
            </Link>
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
              {visibleDeals.map((deal) => {
                const stage = deal.engagement?.stage;
                const isEngaged = Boolean(stage) && stage !== "declined";
                const isDeclined = stage === "declined";

                return (
                  <tr
                    key={deal.id}
                    className={`border-t border-border-gray cursor-pointer hover:bg-border-gray transition-colors ${isDeclined ? "opacity-60" : ""}`}
                    onClick={() => navigateToDeal(deal.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigateToDeal(deal.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open match ${deal.headline}`}
                  >
                    <td className="px-4 py-3 font-medium text-primary hover:underline">{deal.headline}</td>
                    <td className="px-4 py-3 text-text-secondary">{deal.industry}</td>
                    <td className="px-4 py-3 text-text-secondary">{getGeography(deal) || "—"}</td>
                    <td className="px-4 py-3">
                      {deal.revenue_year_3 != null ? formatCurrency(deal.revenue_year_3) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {deal.ebitda_year_3 != null ? formatCurrency(deal.ebitda_year_3) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        {DEAL_STATUS_LABELS[deal.status] || deal.status}
                      </span>
                      {deal.engagement && (
                        <span className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-subtle text-primary capitalize">
                          {deal.engagement.stage.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isEngaged && !isDeclined && (
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
                      )}
                      {isDeclined && (
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
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleDeals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                    {emptyStateMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
    </main>
  );
}