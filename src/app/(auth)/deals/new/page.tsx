"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INDUSTRIES, REGIONS, US_STATES } from "@/lib/constants";

interface FirmMember {
  id: string;
  full_name: string;
  email: string;
}

export default function CreateDealPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firmMembers, setFirmMembers] = useState<FirmMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

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

  const [teaserFile, setTeaserFile] = useState<File | null>(null);
  const [cimFile, setCimFile] = useState<File | null>(null);
  const [ndaFile, setNdaFile] = useState<File | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setFormData(prev => ({ ...prev, pointOfContactId: user.id }));

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
    };
    loadUser();
  }, []);

  const uploadFile = async (file: File, type: string, dealId?: string) => {
    const supabase = createClient();
    const path = `${dealId || "temp"}/${type}/${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage
      .from("deal-documents")
      .upload(path, file, { contentType: "application/pdf" });
    if (error) throw new Error(`Failed to upload ${type}`);
    return path;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "teaser" | "cim" | "nda"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File must be under 50MB");
      return;
    }
    setError(null);
    if (type === "teaser") setTeaserFile(file);
    else if (type === "cim") setCimFile(file);
    else if (type === "nda") setNdaFile(file);
  };

  const handleSubmit = async (publish: boolean) => {
    setLoading(true);
    setError(null);

    try {
      // Upload files first
      let teaserPath = formData.teaserDocumentPath;
      let cimPath = formData.cimDocumentPath;
      let ndaPath = formData.ndaDocumentPath;

      if (teaserFile) teaserPath = await uploadFile(teaserFile, "teaser");
      if (cimFile) cimPath = await uploadFile(cimFile, "cim");
      if (ndaFile) ndaPath = await uploadFile(ndaFile, "nda");

      const payload = {
        ...formData,
        teaserDocumentPath: teaserPath,
        cimDocumentPath: cimPath,
        ndaDocumentPath: ndaPath,
        publish,
      };

      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create deal");
      }

      const { deal } = await res.json();
      router.push(`/deals/${deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
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

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-primary mb-6">Create New Deal</h1>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Teaser Upload Zone */}
        <div className="bg-surface-alt rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary mb-2">Teaser Document</h2>
          <p className="text-xs text-text-secondary mb-3">
            Upload your teaser PDF. Auto-extraction coming soon — for now the file is stored.
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileChange(e, "teaser")}
            className="text-sm"
          />
          {teaserFile && (
            <p className="text-xs text-success mt-1">{teaserFile.name} selected</p>
          )}
        </div>

        <div className="bg-surface-alt rounded-lg shadow-md p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Project Name * <span className="text-text-secondary font-normal">(internal only)</span>
            </label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              External Headline * <span className="text-text-secondary font-normal">(visible to buyers)</span>
            </label>
            <input
              type="text"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              About the Business *
            </label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          {/* Geography */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Geography Display *</label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="geographyDisplay"
                  value="state"
                  checked={formData.geographyDisplay === "state"}
                  onChange={() => setFormData({ ...formData, geographyDisplay: "state", region: "" })}
                />
                Show specific state
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="geographyDisplay"
                  value="region"
                  checked={formData.geographyDisplay === "region"}
                  onChange={() => setFormData({ ...formData, geographyDisplay: "region", state: "" })}
                />
                Show region only
              </label>
            </div>
            {formData.geographyDisplay === "state" ? (
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              >
                <option value="">Select region</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Industry *</label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Financials Table */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Financials</label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border-gray">
                <thead className="bg-bg-alt">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Period</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Label</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Revenue</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">EBITDA</th>
                  </tr>
                </thead>
                <tbody>
                  {(["year1", "year2", "year3", "projection"] as const).map((year, idx) => (
                    <tr key={year} className="border-t border-border-gray">
                      <td className="px-3 py-2 text-text-secondary">
                        {idx < 3 ? `Year ${idx + 1} (${3 - idx} years ago)` : "Current Year Projection"}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder={idx < 3 ? `FY${2022 + idx}` : "FY2025E"}
                          value={formData.financials[year].label}
                          onChange={(e) => updateFinancials(year, "label", e.target.value)}
                          className="w-full border border-border-gray rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          placeholder="$"
                          value={formData.financials[year].revenue ?? ""}
                          onChange={(e) => updateFinancials(year, "revenue", e.target.value)}
                          className="w-full border border-border-gray rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          placeholder="$"
                          value={formData.financials[year].ebitda ?? ""}
                          onChange={(e) => updateFinancials(year, "ebitda", e.target.value)}
                          className="w-full border border-border-gray rounded px-2 py-1 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* NDA Type */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">NDA Type *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="ndaType"
                  value="platform"
                  checked={formData.ndaType === "platform"}
                  onChange={() => setFormData({ ...formData, ndaType: "platform", ndaDocumentPath: null })}
                />
                Use platform standard NDA
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="ndaType"
                  value="custom"
                  checked={formData.ndaType === "custom"}
                  onChange={() => setFormData({ ...formData, ndaType: "custom" })}
                />
                Upload custom NDA
              </label>
            </div>
            {formData.ndaType === "custom" && (
              <div className="mt-2">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileChange(e, "nda")}
                  className="text-sm"
                />
                {ndaFile && <p className="text-xs text-success mt-1">{ndaFile.name}</p>}
              </div>
            )}
          </div>

          {/* CIM Upload */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              CIM Document <span className="text-text-secondary font-normal">(required to publish)</span>
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileChange(e, "cim")}
              className="text-sm"
            />
            {cimFile && <p className="text-xs text-success mt-1">{cimFile.name}</p>}
          </div>

          {/* CIM Sharing Preference */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">CIM Sharing Preference *</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cimSharingPreference"
                  value="auto"
                  checked={formData.cimSharingPreference === "auto"}
                  onChange={() => setFormData({ ...formData, cimSharingPreference: "auto" })}
                />
                Auto-share upon NDA signature
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cimSharingPreference"
                  value="manual"
                  checked={formData.cimSharingPreference === "manual"}
                  onChange={() => setFormData({ ...formData, cimSharingPreference: "manual" })}
                />
                Manually release to each buyer
              </label>
            </div>
          </div>

          {/* NDA Vetting Preference */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">NDA Vetting Preference *</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="ndaVettingPreference"
                  value="auto"
                  checked={formData.ndaVettingPreference === "auto"}
                  onChange={() => setFormData({ ...formData, ndaVettingPreference: "auto" })}
                />
                Auto-send NDA when buyer pursues
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="ndaVettingPreference"
                  value="manual"
                  checked={formData.ndaVettingPreference === "manual"}
                  onChange={() => setFormData({ ...formData, ndaVettingPreference: "manual" })}
                />
                Review buyer profile before releasing NDA
              </label>
            </div>
          </div>

          {/* Point of Contact */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Point of Contact</label>
            <select
              value={formData.pointOfContactId}
              onChange={(e) => setFormData({ ...formData, pointOfContactId: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            >
              {firmMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} {m.id === currentUserId ? "(you)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Due dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">IOI Due Date</label>
              <input
                type="date"
                value={formData.ioiDueDate}
                onChange={(e) => setFormData({ ...formData, ioiDueDate: e.target.value })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">LOI Due Date</label>
              <input
                type="date"
                value={formData.loiDueDate}
                onChange={(e) => setFormData({ ...formData, loiDueDate: e.target.value })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-border-gray">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="flex-1 bg-surface-alt border border-primary text-primary rounded-md py-3 font-medium hover:bg-bg-alt transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex-1 bg-primary text-white rounded-md py-3 font-medium hover:bg-btn-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
