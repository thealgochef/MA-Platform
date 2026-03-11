"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRIES, US_STATES } from "@/lib/constants";

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("");

  const [formData, setFormData] = useState({
    projectName: "",
    industry: "",
    revenueMin: null as number | null,
    revenueMax: null as number | null,
    ebitdaMin: null as number | null,
    ebitdaMax: null as number | null,
    ebitdaMargin: null as number | null,
    location: "",
    keywords: [] as string[],
  });

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !formData.keywords.includes(kw)) {
      setFormData(prev => ({ ...prev, keywords: [...prev.keywords, kw] }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== kw),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.fieldErrors?.projectName?.[0] || "Failed to create project");
      }
      const { project } = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-light-gray py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy">New Acquisition Project</h1>
          <a href="/dashboard" className="text-sm text-slate-blue hover:underline">Back to dashboard</a>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Project Name *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50"
              placeholder="e.g., Healthcare Roll-Up"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Industry</label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm"
            >
              <option value="">Any industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Revenue Min</label>
              <input
                type="number"
                value={formData.revenueMin ?? ""}
                onChange={(e) => setFormData({ ...formData, revenueMin: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Revenue Max</label>
              <input
                type="number"
                value={formData.revenueMax ?? ""}
                onChange={(e) => setFormData({ ...formData, revenueMax: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm"
                placeholder="No max"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">EBITDA Min</label>
              <input
                type="number"
                value={formData.ebitdaMin ?? ""}
                onChange={(e) => setFormData({ ...formData, ebitdaMin: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">EBITDA Max</label>
              <input
                type="number"
                value={formData.ebitdaMax ?? ""}
                onChange={(e) => setFormData({ ...formData, ebitdaMax: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm"
                placeholder="No max"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">EBITDA Margin (%)</label>
            <input
              type="number"
              value={formData.ebitdaMargin ?? ""}
              onChange={(e) => setFormData({ ...formData, ebitdaMargin: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm"
              placeholder="Minimum margin %"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Location</label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm"
            >
              <option value="">Any location</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Keywords</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                className="flex-1 border border-border-gray rounded-md px-3 py-2 text-sm"
                placeholder="Add keyword and press Enter"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2 bg-light-gray border border-border-gray rounded-md text-sm hover:bg-border-gray"
              >
                Add
              </button>
            </div>
            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 bg-light-gray rounded-full text-xs">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="text-text-secondary hover:text-error">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border-gray">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-navy text-white rounded-md py-3 font-medium hover:bg-slate-blue transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
