"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface Deal {
  id: string;
  headline: string;
  description: string;
  industry: string;
  geography_display: string;
  status: string;
  revenue_year_1: number | null;
  revenue_year_2: number | null;
  revenue_year_3: number | null;
  ebitda_year_1: number | null;
  ebitda_year_2: number | null;
  ebitda_year_3: number | null;
}

interface Engagement {
  id: string;
  stage: string;
  nda_status: string;
  cim_released: boolean;
}

export default function BuyerDealWorkspace() {
  const params = useParams();
  const dealId = params.id as string;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}`);
        if (res.ok) {
          const data = await res.json();
          setDeal(data.deal);
          setEngagement(data.engagement);
        } else {
          setError("Deal not found.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };
    fetchDeal();
  }, [dealId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-text-secondary">Loading deal...</p>
        </div>
      </main>
    );
  }

  if (error || !deal) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-error">{error || "Deal not found."}</p>
        </div>
      </main>
    );
  }

  const stage = engagement?.stage;
  const ndaSigned = engagement?.nda_status === "signed";
  const cimReleased = engagement?.cim_released === true;

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">{deal.headline}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            deal.status === "paused" ? "bg-warning/10 text-warning" :
            deal.status === "terminated" ? "bg-error/10 text-error" :
            deal.status === "closed" ? "bg-text-secondary/10 text-text-secondary" :
            "bg-success/10 text-success"
          }`}>
            {DEAL_STATUS_LABELS[deal.status]}
          </span>
        </div>

        {/* Deal Overview */}
        <div className="bg-surface-alt rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary mb-3">Overview</h2>
          <p className="text-text-secondary mb-4">{deal.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-secondary">Industry</p>
              <p className="font-medium text-text">{deal.industry}</p>
            </div>
            <div>
              <p className="text-text-secondary">Geography</p>
              <p className="font-medium text-text">{deal.geography_display}</p>
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="bg-surface-alt rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary mb-3">Financials</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-gray">
                <th className="text-left py-2 text-text-secondary font-medium">Metric</th>
                <th className="text-right py-2 text-text-secondary font-medium">Year 1</th>
                <th className="text-right py-2 text-text-secondary font-medium">Year 2</th>
                <th className="text-right py-2 text-text-secondary font-medium">Year 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-gray">
                <td className="py-2 text-text">Revenue</td>
                <td className="py-2 text-right">{deal.revenue_year_1 != null ? formatCurrency(deal.revenue_year_1) : "—"}</td>
                <td className="py-2 text-right">{deal.revenue_year_2 != null ? formatCurrency(deal.revenue_year_2) : "—"}</td>
                <td className="py-2 text-right">{deal.revenue_year_3 != null ? formatCurrency(deal.revenue_year_3) : "—"}</td>
              </tr>
              <tr>
                <td className="py-2 text-text">EBITDA</td>
                <td className="py-2 text-right">{deal.ebitda_year_1 != null ? formatCurrency(deal.ebitda_year_1) : "—"}</td>
                <td className="py-2 text-right">{deal.ebitda_year_2 != null ? formatCurrency(deal.ebitda_year_2) : "—"}</td>
                <td className="py-2 text-right">{deal.ebitda_year_3 != null ? formatCurrency(deal.ebitda_year_3) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Engagement Status & Actions */}
        <div className="bg-surface-alt rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary mb-3">Your Engagement</h2>
          {engagement ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">Stage:</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-info/10 text-info">
                  {stage}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {!ndaSigned && stage !== "declined" && stage !== "passed" && stage !== "terminated" && (
                  <Link
                    href={`/deals/${dealId}/nda`}
                    className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
                  >
                    Sign NDA
                  </Link>
                )}

                {ndaSigned && cimReleased && (
                  <Link
                    href={`/api/deals/${dealId}/cim`}
                    className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
                  >
                    View CIM
                  </Link>
                )}

                {ndaSigned && (stage === "nda_signed" || stage === "ioi_submitted") && (
                  <Link
                    href={`/deals/${dealId}/ioi`}
                    className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
                  >
                    Submit IOI
                  </Link>
                )}

                {ndaSigned && (stage === "ioi_submitted" || stage === "loi_submitted") && (
                  <Link
                    href={`/deals/${dealId}/loi`}
                    className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
                  >
                    Submit LOI
                  </Link>
                )}

                {ndaSigned && stage !== "passed" && stage !== "terminated" && (
                  <Link
                    href={`/deals/${dealId}/close`}
                    className="px-4 py-2 border border-border-gray text-text rounded-md text-sm font-medium hover:bg-bg-alt transition-colors"
                  >
                    Report Closure
                  </Link>
                )}
              </div>

              {/* Messaging link */}
              {engagement.id && (
                <div className="pt-3 border-t border-border-gray">
                  <Link
                    href={`/messages/${engagement.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Message Broker
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">No active engagement with this deal.</p>
          )}
        </div>
      </div>
    </main>
  );
}
