"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

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

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch("/api/deals");
        if (res.ok) {
          const data = await res.json();
          setDeals(data.deals || []);
        } else {
          setError("Failed to load deals.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };
    fetchDeals();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-light-gray p-8">
        <p className="text-text-secondary">Loading deals...</p>
      </div>
    );
  }

  const filtered =
    filter === "all"
      ? deals
      : deals.filter((d) => d.status === filter);

  const statuses = Array.from(new Set(deals.map((d) => d.status)));

  return (
    <div className="min-h-screen bg-light-gray py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy">My Deals</h1>
          <Link
            href="/deals/new"
            className="px-4 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-slate-blue transition-colors"
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
                  ? "bg-navy text-white"
                  : "bg-white text-text-secondary border border-border-gray hover:bg-light-gray"
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
                    ? "bg-navy text-white"
                    : "bg-white text-text-secondary border border-border-gray hover:bg-light-gray"
                }`}
              >
                {DEAL_STATUS_LABELS[s] || s} ({deals.filter((d) => d.status === s).length})
              </button>
            ))}
          </div>
        )}

        {deals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-text-secondary mb-4">You haven&apos;t created any deals yet.</p>
            <Link
              href="/deals/new"
              className="inline-block px-6 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-slate-blue transition-colors"
            >
              Create Your First Deal
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-gray bg-light-gray">
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Project Name</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Headline</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Industry</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">EBITDA</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Views</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal) => (
                  <tr key={deal.id} className="border-t border-border-gray hover:bg-light-gray">
                    <td className="px-4 py-3">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="font-medium text-navy hover:underline"
                      >
                        {deal.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{deal.headline}</td>
                    <td className="px-4 py-3 text-text-secondary">{deal.industry}</td>
                    <td className="px-4 py-3">
                      {deal.revenue_year_3 != null ? formatCurrency(deal.revenue_year_3) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {deal.ebitda_year_3 != null ? formatCurrency(deal.ebitda_year_3) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          deal.status === "draft"
                            ? "bg-warning/10 text-warning"
                            : deal.status === "paused"
                              ? "bg-warning/10 text-warning"
                              : deal.status === "terminated"
                                ? "bg-error/10 text-error"
                                : deal.status === "closed"
                                  ? "bg-text-secondary/10 text-text-secondary"
                                  : "bg-success/10 text-success"
                        }`}
                      >
                        {DEAL_STATUS_LABELS[deal.status] || deal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{deal.view_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
