"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface Deal {
  id: string;
  headline: string;
  description: string;
  status: string;
  industry: string;
  geography_display: string;
  state: string | null;
  region: string | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  revenue_projection: number | null;
  ebitda_projection: number | null;
  fiscal_year_labels: Record<string, string> | null;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  teaser_document_path: string | null;
  cim_document_path: string | null;
}

export default function DealPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeal = async () => {
      const res = await fetch(`/api/deals/${dealId}`);
      if (res.ok) {
        const data = await res.json();
        setDeal(data.deal);
      }
      setLoading(false);
    };
    fetchDeal();
  }, [dealId]);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus: "accepting_iois" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }
      router.push(`/deals/${dealId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-light-gray p-8">
        <p className="text-text-secondary">Loading preview...</p>
      </main>
    );
  }

  if (!deal) {
    return (
      <main className="min-h-screen bg-light-gray p-8">
        <p className="text-error">Deal not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-light-gray py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Preview Banner */}
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-warning">Preview Mode — Buyer Perspective</p>
            <p className="text-xs text-text-secondary">This is how buyers will see your deal listing.</p>
          </div>
          <div className="flex gap-2">
            <a href={`/deals/${dealId}/edit`} className="px-3 py-1 bg-white border border-border-gray text-text-primary rounded-md text-sm hover:bg-light-gray">
              Edit
            </a>
            {deal.status === "draft" && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-4 py-1 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover disabled:opacity-50"
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">{error}</div>
        )}

        {/* Deal Card — Buyer View */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-xl font-bold text-navy">{deal.headline}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              deal.status === "draft" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
            }`}>
              {DEAL_STATUS_LABELS[deal.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-text-secondary">Industry</p>
              <p className="text-sm font-medium">{deal.industry}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Geography</p>
              <p className="text-sm font-medium">
                {deal.geography_display === "state" ? deal.state : deal.region}
              </p>
            </div>
            {deal.ioi_due_date && (
              <div>
                <p className="text-xs text-text-secondary">IOI Due Date</p>
                <p className="text-sm font-medium">{deal.ioi_due_date}</p>
              </div>
            )}
            {deal.loi_due_date && (
              <div>
                <p className="text-xs text-text-secondary">LOI Due Date</p>
                <p className="text-sm font-medium">{deal.loi_due_date}</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary mb-2">About the Business</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{deal.description}</p>
          </div>

          {/* Financials summary */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary mb-2">Financials</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-light-gray rounded-md p-3">
                <p className="text-xs text-text-secondary">Revenue (Last Year)</p>
                <p className="text-lg font-bold text-navy">
                  {deal.revenue_year_3 != null ? formatCurrency(deal.revenue_year_3) : "—"}
                </p>
              </div>
              <div className="bg-light-gray rounded-md p-3">
                <p className="text-xs text-text-secondary">EBITDA (Last Year)</p>
                <p className="text-lg font-bold text-navy">
                  {deal.ebitda_year_3 != null ? formatCurrency(deal.ebitda_year_3) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Teaser info */}
          {deal.teaser_document_path && (
            <div className="bg-light-gray rounded-md p-3">
              <p className="text-sm font-medium">Teaser Available</p>
              <p className="text-xs text-text-secondary">Download the teaser document for more details.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
