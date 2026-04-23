"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INDUSTRIES, REGIONS, US_STATES } from "@/lib/constants";

interface FirmMember {
  id: string;
  full_name: string;
  email: string;
}

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firmMembers, setFirmMembers] = useState<FirmMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  const [formData, setFormData] = useState({
    projectName: "",
    headline: "",
    description: "",
    geographyDisplay: "state" as "state" | "region",
    state: "",
    region: "",
    industry: "",
    financials: {
      year1: { label: "", revenue: null as number | null, ebitda: null as number | null },
      year2: { label: "", revenue: null as number | null, ebitda: null as number | null },
      year3: { label: "", revenue: null as number | null, ebitda: null as number | null },
      projection: { label: "", revenue: null as number | null, ebitda: null as number | null },
    },
    ndaType: "platform" as "platform" | "custom",
    cimSharingPreference: "auto" as "auto" | "manual",
    ndaVettingPreference: "auto" as "auto" | "manual",
    pointOfContactId: "",
    teaserDocumentPath: null as string | null,
    ndaDocumentPath: null as string | null,
    cimDocumentPath: null as string | null,
    ioiDueDate: "",
    loiDueDate: "",
  });

  useEffect(() => {
    const loadDeal = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("users")
          .select("firm_id")
          .eq("id", user.id)
          .single();
        if (profile?.firm_id) {
          const { data: members } = await supabase
            .from("users")
            .select("id, full_name, email")
            .eq("firm_id", profile.firm_id)
            .eq("status", "approved");
          setFirmMembers(members || []);
        }
      }

      const res = await fetch(`/api/deals/${dealId}`);
      if (res.ok) {
        const { deal } = await res.json();
        const fyLabels = deal.fiscal_year_labels || {};
        setFormData({
          projectName: deal.project_name || "",
          headline: deal.headline || "",
          description: deal.description || "",
          geographyDisplay: deal.geography_display || "state",
          state: deal.state || "",
          region: deal.region || "",
          industry: deal.industry || "",
          financials: {
            year1: { label: fyLabels.year_1 || "", revenue: deal.revenue_year_1, ebitda: deal.ebitda_year_1 },
            year2: { label: fyLabels.year_2 || "", revenue: deal.revenue_year_2, ebitda: deal.ebitda_year_2 },
            year3: { label: fyLabels.year_3 || "", revenue: deal.revenue_year_3, ebitda: deal.ebitda_year_3 },
            projection: { label: fyLabels.projection || "", revenue: deal.revenue_projection, ebitda: deal.ebitda_projection },
          },
          ndaType: deal.nda_type || "platform",
          cimSharingPreference: deal.cim_sharing_preference || "auto",
          ndaVettingPreference: deal.nda_vetting_preference || "auto",
          pointOfContactId: deal.point_of_contact_id || "",
          teaserDocumentPath: deal.teaser_document_path,
          ndaDocumentPath: deal.nda_document_path,
          cimDocumentPath: deal.cim_document_path,
          ioiDueDate: deal.ioi_due_date || "",
          loiDueDate: deal.loi_due_date || "",
        });
      }
      setLoading(false);
    };
    loadDeal();
  }, [dealId]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "teaser" | "cim" | "nda"
  ) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File must be under 50MB");
      return;
    }
    setError(null);

    const supabase = createClient();
    const path = `${dealId}/${type}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("deal-documents")
      .upload(path, file, { contentType: "application/pdf" });
    if (uploadError) {
      setError(`Failed to upload ${type}`);
      return;
    }

    const key = type === "teaser" ? "teaserDocumentPath" : type === "cim" ? "cimDocumentPath" : "ndaDocumentPath";
    setFormData(prev => ({ ...prev, [key]: path }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      router.push(`/deals/${dealId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const updateFinancials = (
    year: "year1" | "year2" | "year3" | "projection",
    field: "label" | "revenue" | "ebitda",
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        [year]: {
          ...prev.financials[year],
          [field]: field === "label" ? value : (value ? parseFloat(value) : null),
        },
      },
    }));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading deal...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">Edit Deal</h1>
          <a href={`/deals/${dealId}`} className="text-sm text-secondary hover:underline">Back to deal</a>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">{error}</div>
        )}

        <div className="bg-surface-alt rounded-lg shadow-md p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Project Name *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">External Headline *</label>
            <input
              type="text"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Description *</label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Geography Display *</label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={formData.geographyDisplay === "state"} onChange={() => setFormData({ ...formData, geographyDisplay: "state", region: "" })} />
                State
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={formData.geographyDisplay === "region"} onChange={() => setFormData({ ...formData, geographyDisplay: "region", state: "" })} />
                Region
              </label>
            </div>
            {formData.geographyDisplay === "state" ? (
              <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm">
                <option value="">Select state</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <select value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm">
                <option value="">Select region</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Industry *</label>
            <select value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm">
              <option value="">Select</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* Financials */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Financials</label>
            <table className="w-full text-sm border border-border-gray">
              <thead className="bg-bg-alt">
                <tr>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-left">Label</th>
                  <th className="px-3 py-2 text-left">Revenue</th>
                  <th className="px-3 py-2 text-left">EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {(["year1", "year2", "year3", "projection"] as const).map((year, idx) => (
                  <tr key={year} className="border-t border-border-gray">
                    <td className="px-3 py-2 text-text-secondary">{idx < 3 ? `Year ${idx + 1}` : "Projection"}</td>
                    <td className="px-3 py-2">
                      <input type="text" value={formData.financials[year].label} onChange={(e) => updateFinancials(year, "label", e.target.value)} className="w-full border border-border-gray rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={formData.financials[year].revenue ?? ""} onChange={(e) => updateFinancials(year, "revenue", e.target.value)} className="w-full border border-border-gray rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={formData.financials[year].ebitda ?? ""} onChange={(e) => updateFinancials(year, "ebitda", e.target.value)} className="w-full border border-border-gray rounded px-2 py-1 text-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* File uploads */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Teaser Document</label>
              {formData.teaserDocumentPath && <p className="text-xs text-success mb-1">Uploaded</p>}
              <input type="file" accept="application/pdf" onChange={(e) => handleFileUpload(e, "teaser")} className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">CIM Document</label>
              {formData.cimDocumentPath && <p className="text-xs text-success mb-1">Uploaded</p>}
              <input type="file" accept="application/pdf" onChange={(e) => handleFileUpload(e, "cim")} className="text-sm" />
            </div>
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">NDA Type</label>
              <select value={formData.ndaType} onChange={(e) => setFormData({ ...formData, ndaType: e.target.value as "platform" | "custom" })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm">
                <option value="platform">Platform Standard</option>
                <option value="custom">Custom NDA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">CIM Sharing</label>
              <select value={formData.cimSharingPreference} onChange={(e) => setFormData({ ...formData, cimSharingPreference: e.target.value as "auto" | "manual" })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm">
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">NDA Vetting</label>
              <select value={formData.ndaVettingPreference} onChange={(e) => setFormData({ ...formData, ndaVettingPreference: e.target.value as "auto" | "manual" })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm">
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          {/* POC */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Point of Contact</label>
            <select value={formData.pointOfContactId} onChange={(e) => setFormData({ ...formData, pointOfContactId: e.target.value })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm">
              {firmMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.id === currentUserId ? " (you)" : ""}</option>)}
            </select>
          </div>

          {/* Due dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">IOI Due Date</label>
              <input type="date" value={formData.ioiDueDate} onChange={(e) => setFormData({ ...formData, ioiDueDate: e.target.value })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">LOI Due Date</label>
              <input type="date" value={formData.loiDueDate} onChange={(e) => setFormData({ ...formData, loiDueDate: e.target.value })} className="w-full border border-border-gray rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="pt-4 border-t border-border-gray">
            <button onClick={handleSave} disabled={saving} className="w-full bg-primary text-white rounded-md py-3 font-medium hover:bg-btn-hover transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
