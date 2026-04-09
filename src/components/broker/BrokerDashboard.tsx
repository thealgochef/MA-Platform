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

export default function BrokerDashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <main className="min-h-screen bg-light-gray p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  const activeDeals = deals.filter(d => !["terminated", "closed"].includes(d.status));
  const closedDeals = deals.filter(d => d.status === "closed");
  const draftDeals = deals.filter(d => d.status === "draft");

  return (
    <main className="min-h-screen bg-light-gray py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
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
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-text-secondary">Total Deals</p>
            <p className="text-2xl font-bold text-navy">{deals.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-text-secondary">Active Deals</p>
            <p className="text-2xl font-bold text-navy">{activeDeals.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-text-secondary">Drafts</p>
            <p className="text-2xl font-bold text-navy">{draftDeals.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-text-secondary">Closed</p>
            <p className="text-2xl font-bold text-navy">{closedDeals.length}</p>
          </div>
        </div>

        {/* Deal List */}
        <h2 className="text-lg font-semibold text-navy mb-4">Your Deals</h2>

        {deals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-text-secondary mb-4">Post your first deal</p>
            <Link
              href="/deals/new"
              className="inline-block px-6 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-slate-blue transition-colors"
            >
              Create Deal
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
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Views</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-t border-border-gray hover:bg-light-gray cursor-pointer"
                    onClick={() => window.location.href = `/deals/${deal.id}`}
                  >
                    <td className="px-4 py-3 font-medium text-navy">{deal.project_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{deal.headline}</td>
                    <td className="px-4 py-3 text-text-secondary">{deal.industry}</td>
                    <td className="px-4 py-3">
                      {deal.revenue_year_3 != null ? formatCurrency(deal.revenue_year_3) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        deal.status === "draft" ? "bg-warning/10 text-warning" :
                        deal.status === "paused" ? "bg-warning/10 text-warning" :
                        deal.status === "terminated" ? "bg-error/10 text-error" :
                        deal.status === "closed" ? "bg-text-secondary/10 text-text-secondary" :
                        "bg-success/10 text-success"
                      }`}>
                        {DEAL_STATUS_LABELS[deal.status]}
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
    </main>
  );
}
