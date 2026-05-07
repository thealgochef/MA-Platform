"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEAL_STATUS_LABELS, VALID_DEAL_TRANSITIONS, BUYER_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type Tab = "Overview" | "Pipeline" | "Offers" | "Documents" | "Messaging" | "Analytics" | "Timeline";

interface Deal {
  id: string;
  project_name: string;
  headline: string;
  description: string;
  status: string;
  industry: string;
  geography_display: string;
  state: string | null;
  region: string | null;
  revenue_year_1: number | null;
  ebitda_year_1: number | null;
  revenue_year_2: number | null;
  ebitda_year_2: number | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  revenue_projection: number | null;
  ebitda_projection: number | null;
  fiscal_year_labels: Record<string, string> | null;
  nda_type: string;
  cim_sharing_preference: string;
  nda_vetting_preference: string;
  teaser_document_path: string | null;
  cim_document_path: string | null;
  nda_document_path: string | null;
  point_of_contact_id: string;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  published_at: string | null;
  closed_at: string | null;
  view_count: number;
  created_at: string;
}

interface Engagement {
  id: string;
  stage: string;
  nda_status: string;
  cim_released: boolean;
  cim_viewed_at: string | null;
  cim_downloaded_at: string | null;
  users: { id: string; full_name: string; email: string; buyer_type: string | null; firms: { id: string; name: string; website: string } | null };
  firms?: { id: string; name: string } | null;
}

interface Activity {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: { full_name: string; role: string } | null;
}

export default function BrokerDealManagement() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [iois, setIois] = useState<Record<string, unknown>[]>([]);
  const [lois, setLois] = useState<Record<string, unknown>[]>([]);
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusChanging, setStatusChanging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchDeal = useCallback(async () => {
    const res = await fetch(`/api/deals/${dealId}`);
    if (res.ok) {
      const data = await res.json();
      setDeal(data.deal);
    }
    setLoading(false);
  }, [dealId]);

  const fetchPipeline = useCallback(async () => {
    const res = await fetch(`/api/deals/${dealId}/buyers`);
    if (res.ok) {
      const data = await res.json();
      setEngagements(data.engagements || []);
      setIois(data.iois || []);
      setLois(data.lois || []);
    }
  }, [dealId]);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch(`/api/deals/${dealId}/documents`);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents || []);
    }
  }, [dealId]);

  const fetchTimeline = useCallback(async () => {
    const res = await fetch(`/api/deals/${dealId}/timeline`);
    if (res.ok) {
      const data = await res.json();
      setActivities(data.activities || []);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDeal();
    fetchPipeline();
    fetchDocuments();
    fetchTimeline();
  }, [fetchDeal, fetchPipeline, fetchDocuments, fetchTimeline]);

  const handleStatusChange = async (newStatus: string) => {
    let winningEngagementId: string | undefined;

    if (newStatus === "closed") {
      const eligibleEngagements = engagements.filter((engagement) =>
        ["loi_submitted", "diligence", "closed"].includes(engagement.stage)
      );

      if (eligibleEngagements.length === 0) {
        window.alert("No eligible winning engagement found. Move a buyer to LOI submitted or diligence before closing.");
        return;
      }

      if (eligibleEngagements.length === 1) {
        winningEngagementId = eligibleEngagements[0].id;
      } else {
        const options = eligibleEngagements
          .map((engagement, index) => `${index + 1}. ${engagement.users?.full_name || engagement.firms?.name || engagement.id} (${engagement.stage})`)
          .join("\n");
        const selection = window.prompt(`Select the winning engagement to close:\n${options}`);
        const selectedIndex = selection ? Number.parseInt(selection, 10) - 1 : -1;
        winningEngagementId = eligibleEngagements[selectedIndex]?.id;

        if (!winningEngagementId) {
          window.alert("A valid winning engagement selection is required to close the deal.");
          return;
        }
      }
    }

    setStatusChanging(true);
    const res = await fetch(`/api/deals/${dealId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus, winningEngagementId }),
    });
    if (res.ok) {
      await fetchDeal();
      await fetchTimeline();
    }
    setStatusChanging(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const supabase = createClient();
    const path = `${dealId}/additional/${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage
      .from("deal-documents")
      .upload(path, file, { contentType: "application/pdf" });
    if (error) return;

    await fetch(`/api/deals/${dealId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, filePath: path, fileSize: file.size }),
    });
    fetchDocuments();
  };

  const handleDeleteDeal = async () => {
    setDeleteError(null);
    setDeletingDeal(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/deals");
        return;
      }

      const payload = await res.json().catch(() => null);
      setDeleteError(payload?.error || "Failed to delete this deal. Please try again.");
    } catch {
      setDeleteError("Unable to reach the server. Please try again.");
    } finally {
      setDeletingDeal(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-text-secondary">Loading deal...</p>
        </div>
      </main>
    );
  }

  if (!deal) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-error">Deal not found.</p>
        </div>
      </main>
    );
  }

  const tabs: Tab[] = ["Overview", "Pipeline", "Offers", "Documents", "Messaging", "Analytics", "Timeline"];
  const availableTransitions = VALID_DEAL_TRANSITIONS[deal.status] || [];

  const daysOnMarket = deal.published_at
    ? Math.floor((Date.now() - new Date(deal.published_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const passCount = engagements.filter(e => e.stage === "passed").length;
  const pursueCount = engagements.filter(e => !["declined", "passed", "terminated"].includes(e.stage)).length;
  const ndaSigned = engagements.filter(e => e.nda_status === "signed").length;
  const ndaSent = engagements.filter(e => ["sent", "signed"].includes(e.nda_status)).length;

  return (
    <main className="min-h-screen bg-bg-alt">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="bg-surface-alt rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">

            <div>
              <h1 className="text-2xl font-bold text-primary">{deal.project_name}</h1>
              <p className="text-text-secondary text-sm mt-1">{deal.headline}</p>
            </div>
            <div className="flex items-start gap-3">

              <span className={`inline-flex h-8 items-center px-3 py-1 rounded-full text-xs font-medium ${
                deal.status === "draft" ? "bg-warning/10 text-warning" :
                deal.status === "paused" ? "bg-warning/10 text-warning" :
                deal.status === "terminated" ? "bg-error/10 text-error" :
                deal.status === "closed" ? "bg-text-secondary/10 text-text-secondary" :
                "bg-success/10 text-success"
              }`}>
                {DEAL_STATUS_LABELS[deal.status]}
              </span>

              {availableTransitions.length > 0 && (
                <select
                  disabled={statusChanging}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleStatusChange(e.target.value);
                  }}
                  className="h-8 border border-border-gray rounded-md px-2 py-1 text-sm"
                >
                  <option value="">Change status...</option>
                  {availableTransitions.map((s) => (
                    <option key={s} value={s}>{DEAL_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              )}
              
              <div className="flex flex-col gap-2">
                <a
                  href={`/deals/${dealId}/edit`}
                  className="inline-flex h-8 items-center justify-center px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-btn-hover transition-colors text-center"
                >
                  Edit
                </a>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex h-8 items-center justify-center px-3 py-1 bg-error text-white rounded-md text-sm hover:opacity-90 transition-opacity"
                >
                  Delete
                </button>
              </div>
              {deal.status === "draft" && (
                <a
                  href={`/deals/${dealId}/preview`}
                  className="px-3 py-1 bg-bg-alt border border-primary text-primary rounded-md text-sm hover:bg-neutral-btn-hover transition-colors"
                >
                  Preview
                </a>
              )}
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-text">Delete deal?</h2>
              <p className="mt-2 text-sm text-text-secondary">
                This action cannot be undone. This will permanently delete this deal and its related records.
              </p>
              {deleteError && (
                <p className="mt-3 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
                  {deleteError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deletingDeal}
                  onClick={() => {
                    setDeleteError(null);
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-md border border-border-gray px-3 py-1.5 text-sm text-text hover:bg-bg-alt transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingDeal}
                  onClick={handleDeleteDeal}
                  className="rounded-md bg-error px-3 py-1.5 text-sm text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingDeal ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-surface-alt rounded-lg shadow-md mb-6">
          <div className="flex border-b border-border-gray overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-primary text-primary"
                    : "text-text-secondary hover:text-text"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "Overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <p className="text-xs text-text-secondary">NDA Type</p>
                    <p className="text-sm font-medium">{deal.nda_type === "platform" ? "Platform Standard" : "Custom"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">CIM Sharing</p>
                    <p className="text-sm font-medium">{deal.cim_sharing_preference === "auto" ? "Auto" : "Manual"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">NDA Vetting</p>
                    <p className="text-sm font-medium">{deal.nda_vetting_preference === "auto" ? "Auto" : "Manual"}</p>
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
                <div className="mt-4">
                  <p className="text-xs text-text-secondary mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{deal.description}</p>
                </div>
                {/* Financials */}
                <div className="mt-4">
                  <p className="text-xs text-text-secondary mb-2">Financials</p>
                  <table className="w-full text-sm border border-border-gray">
                    <thead className="bg-bg-alt">
                      <tr>
                        <th className="px-3 py-2 text-left">Period</th>
                        <th className="px-3 py-2 text-right">Revenue</th>
                        <th className="px-3 py-2 text-right">EBITDA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: deal.fiscal_year_labels?.year_1 || "Year 1", rev: deal.revenue_year_1, eb: deal.ebitda_year_1 },
                        { label: deal.fiscal_year_labels?.year_2 || "Year 2", rev: deal.revenue_year_2, eb: deal.ebitda_year_2 },
                        { label: deal.fiscal_year_labels?.year_3 || "Year 3", rev: deal.revenue_year_3, eb: deal.ebitda_year_3 },
                        { label: deal.fiscal_year_labels?.projection || "Projection", rev: deal.revenue_projection, eb: deal.ebitda_projection },
                      ].map((row, i) => (
                        <tr key={i} className="border-t border-border-gray">
                          <td className="px-3 py-2">{row.label}</td>
                          <td className="px-3 py-2 text-right">{row.rev != null ? formatCurrency(row.rev) : "—"}</td>
                          <td className="px-3 py-2 text-right">{row.eb != null ? formatCurrency(row.eb) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pipeline Tab */}
            {activeTab === "Pipeline" && (
              <div>
                {engagements.length === 0 ? (
                  <p className="text-text-secondary text-sm">No buyers have pursued this deal yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-bg-alt">
                        <tr>
                          <th className="px-3 py-2 text-left">Buyer</th>
                          <th className="px-3 py-2 text-left">Firm</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Stage</th>
                          <th className="px-3 py-2 text-left">NDA</th>
                          <th className="px-3 py-2 text-left">CIM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engagements.map((eng) => (
                          <tr key={eng.id} className="border-t border-border-gray">
                            <td className="px-3 py-2">{eng.users?.full_name || "—"}</td>
                            <td className="px-3 py-2">{eng.users?.firms?.name || eng.firms?.name || "—"}</td>
                            <td className="px-3 py-2">{BUYER_TYPES.find(bt => bt.value === eng.users?.buyer_type)?.label || eng.users?.buyer_type || "—"}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded text-xs bg-info/10 text-info">{eng.stage}</span>
                            </td>
                            <td className="px-3 py-2">{eng.nda_status}</td>
                            <td className="px-3 py-2">{eng.cim_released ? (eng.cim_viewed_at ? "Viewed" : "Released") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === "Offers" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-primary">IOIs ({iois.length})</h3>
                    {iois.length >= 2 && (
                      <a href={`/deals/${dealId}/ioi-compare`} className="text-sm text-secondary hover:underline">
                        Compare IOIs
                      </a>
                    )}
                  </div>
                  {iois.length === 0 ? (
                    <p className="text-text-secondary text-sm">No IOIs submitted yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-border-gray">
                        <thead className="bg-bg-alt">
                          <tr>
                            <th className="px-3 py-2 text-left">Buyer</th>
                            <th className="px-3 py-2 text-right">Offer Price</th>
                            <th className="px-3 py-2 text-right">Multiple</th>
                            <th className="px-3 py-2 text-left">Earnout</th>
                            <th className="px-3 py-2 text-right">Cash at Close</th>
                            <th className="px-3 py-2 text-left">Time to Close</th>
                          </tr>
                        </thead>
                        <tbody>
                          {iois.map((ioi: Record<string, unknown>) => (
                            <tr key={ioi.id as string} className="border-t border-border-gray">
                              <td className="px-3 py-2">{ioi.buyer_user_id as string}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(ioi.offer_price as number)}</td>
                              <td className="px-3 py-2 text-right">{ioi.multiple as number}x</td>
                              <td className="px-3 py-2">{ioi.earnout as string}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(ioi.cash_at_close as number)}</td>
                              <td className="px-3 py-2">{ioi.time_to_close as string}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-primary">LOIs ({lois.length})</h3>
                    {lois.length >= 2 && (
                      <a href={`/deals/${dealId}/loi-compare`} className="text-sm text-secondary hover:underline">
                        Compare LOIs
                      </a>
                    )}
                  </div>
                  {lois.length === 0 ? (
                    <p className="text-text-secondary text-sm">No LOIs submitted yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-border-gray">
                        <thead className="bg-bg-alt">
                          <tr>
                            <th className="px-3 py-2 text-left">Buyer</th>
                            <th className="px-3 py-2 text-right">Offer Price</th>
                            <th className="px-3 py-2 text-right">Multiple</th>
                            <th className="px-3 py-2 text-left">Escrow</th>
                            <th className="px-3 py-2 text-left">Timing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lois.map((loi: Record<string, unknown>) => (
                            <tr key={loi.id as string} className="border-t border-border-gray">
                              <td className="px-3 py-2">{loi.buyer_user_id as string}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(loi.offer_price as number)}</td>
                              <td className="px-3 py-2 text-right">{loi.multiple as number}x</td>
                              <td className="px-3 py-2">{loi.escrow as string}</td>
                              <td className="px-3 py-2">{loi.timing as string}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "Documents" && (
              <div>
                <div className="space-y-2 mb-4">
                  {deal.teaser_document_path && (
                    <div className="flex items-center justify-between py-2 border-b border-border-gray">
                      <span className="text-sm">Teaser</span>
                      <span className="text-xs text-text-secondary">{deal.teaser_document_path}</span>
                    </div>
                  )}
                  {deal.nda_document_path && (
                    <div className="flex items-center justify-between py-2 border-b border-border-gray">
                      <span className="text-sm">NDA (Custom)</span>
                      <span className="text-xs text-text-secondary">{deal.nda_document_path}</span>
                    </div>
                  )}
                  {deal.cim_document_path && (
                    <div className="flex items-center justify-between py-2 border-b border-border-gray">
                      <span className="text-sm">CIM</span>
                      <span className="text-xs text-text-secondary">{deal.cim_document_path}</span>
                    </div>
                  )}
                  {documents.map((doc: Record<string, unknown>) => (
                    <div key={doc.id as string} className="flex items-center justify-between py-2 border-b border-border-gray">
                      <span className="text-sm">{doc.file_name as string}</span>
                      <span className="text-xs text-text-secondary">{doc.access_level as string}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Upload Additional Document</label>
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="text-sm" />
                </div>
              </div>
            )}

            {/* Messaging Tab */}
            {activeTab === "Messaging" && (
              <div>
                {engagements.length === 0 ? (
                  <p className="text-text-secondary text-sm">No message threads yet.</p>
                ) : (
                  <div className="space-y-2">
                    {engagements.map((eng) => (
                      <a
                        key={eng.id}
                        href={`/messages/${eng.id}`}
                        className="block p-3 border border-border-gray rounded-md hover:bg-bg-alt transition-colors"
                      >
                        <p className="text-sm font-medium">{eng.users?.full_name}</p>
                        <p className="text-xs text-text-secondary">{eng.firms?.name} — {eng.stage}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "Analytics" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{deal.view_count}</p>
                  <p className="text-xs text-text-secondary">Total Views</p>
                </div>
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{pursueCount}</p>
                  <p className="text-xs text-text-secondary">Pursues</p>
                </div>
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{passCount}</p>
                  <p className="text-xs text-text-secondary">Passes</p>
                </div>
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{ndaSent}</p>
                  <p className="text-xs text-text-secondary">NDAs Sent</p>
                </div>
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{ndaSigned}</p>
                  <p className="text-xs text-text-secondary">NDAs Signed</p>
                </div>
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{iois.length}</p>
                  <p className="text-xs text-text-secondary">IOIs Received</p>
                </div>
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{lois.length}</p>
                  <p className="text-xs text-text-secondary">LOIs Received</p>
                </div>
                <div className="bg-bg-alt rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{daysOnMarket}</p>
                  <p className="text-xs text-text-secondary">Days on Market</p>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === "Timeline" && (
              <div>
                {activities.length === 0 ? (
                  <p className="text-text-secondary text-sm">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border-gray last:border-0">
                        <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">{activity.actor?.full_name || "System"}</span>
                            {" — "}
                            {activity.action.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
