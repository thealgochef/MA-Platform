"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface LOI {
  id: string;
  offer_price: number;
  multiple: number;
  escrow: string;
  timing: string;
  earnout: string;
  rollover: string;
  working_capital_peg: string;
  cash_at_close: number;
  is_platform: boolean;
  is_addon: boolean;
  addon_platform_url: string | null;
  special_considerations: string | null;
  submitted_at: string;
}

export default function LOISubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [previousLOIs, setPreviousLOIs] = useState<LOI[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [offerPrice, setOfferPrice] = useState<number | "">("");
  const [multiple, setMultiple] = useState<number | "">("");
  const [escrow, setEscrow] = useState("");
  const [timing, setTiming] = useState("");
  const [earnout, setEarnout] = useState("");
  const [rollover, setRollover] = useState("");
  const [workingCapitalPeg, setWorkingCapitalPeg] = useState("");
  const [cashAtClose, setCashAtClose] = useState<number | "">("");
  const [dealType, setDealType] = useState<"platform" | "addon">("platform");
  const [addonPlatformUrl, setAddonPlatformUrl] = useState("");
  const [specialConsiderations, setSpecialConsiderations] = useState("");

  useEffect(() => {
    const fetchLOIs = async () => {
      const res = await fetch(`/api/deals/${dealId}/loi`);
      if (res.ok) {
        const data = await res.json();
        setPreviousLOIs(data.lois);
      }
      setLoading(false);
    };
    fetchLOIs();
  }, [dealId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/loi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerPrice: Number(offerPrice),
          multiple: Number(multiple),
          escrow,
          timing,
          earnout,
          rollover,
          workingCapitalPeg,
          cashAtClose: Number(cashAtClose),
          isPlatform: dealType === "platform",
          isAddon: dealType === "addon",
          addonPlatformUrl: dealType === "addon" ? addonPlatformUrl : null,
          specialConsiderations: specialConsiderations || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit LOI");
      }

      router.push(`/deals/${dealId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-primary mb-2">Submit Letter of Intent</h1>
        <p className="text-sm text-text-secondary mb-6">
          Submit your LOI for this deal.
        </p>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {previousLOIs.length > 0 && (
          <div className="bg-surface-alt rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-sm font-medium text-text mb-3">
              Previous LOIs ({previousLOIs.length})
            </h3>
            <div className="space-y-2">
              {previousLOIs.map((loi) => (
                <div key={loi.id} className="flex justify-between text-sm border-b border-border-gray pb-2">
                  <span>${loi.offer_price.toLocaleString()} ({loi.multiple}x)</span>
                  <span className="text-text-secondary">
                    {new Date(loi.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-surface-alt rounded-lg shadow-md p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Offer Price ($) *</label>
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value ? Number(e.target.value) : "")}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Multiple *</label>
              <input
                type="number"
                step="0.1"
                value={multiple}
                onChange={(e) => setMultiple(e.target.value ? Number(e.target.value) : "")}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Escrow *</label>
            <input
              type="text"
              value={escrow}
              onChange={(e) => setEscrow(e.target.value)}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Timing *</label>
            <input
              type="text"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              placeholder="e.g., 60-day exclusivity period"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Earnout *</label>
            <input
              type="text"
              value={earnout}
              onChange={(e) => setEarnout(e.target.value)}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Rollover *</label>
            <input
              type="text"
              value={rollover}
              onChange={(e) => setRollover(e.target.value)}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Working Capital Peg *</label>
            <input
              type="text"
              value={workingCapitalPeg}
              onChange={(e) => setWorkingCapitalPeg(e.target.value)}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Cash at Close ($) *</label>
            <input
              type="number"
              value={cashAtClose}
              onChange={(e) => setCashAtClose(e.target.value ? Number(e.target.value) : "")}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              required
            />
          </div>

          {/* Platform or Add-On */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Deal Type *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dealType"
                  value="platform"
                  checked={dealType === "platform"}
                  onChange={() => setDealType("platform")}
                  className="text-secondary"
                />
                <span className="text-sm">Platform</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dealType"
                  value="addon"
                  checked={dealType === "addon"}
                  onChange={() => setDealType("addon")}
                  className="text-secondary"
                />
                <span className="text-sm">Add-On</span>
              </label>
            </div>
          </div>

          {dealType === "addon" && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Platform Company Website URL *
              </label>
              <input
                type="url"
                value={addonPlatformUrl}
                onChange={(e) => setAddonPlatformUrl(e.target.value)}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                placeholder="https://..."
                required
              />
            </div>
          )}

          {/* Optional */}
          <hr className="border-border-gray" />
          <p className="text-xs text-text-secondary">Optional Fields</p>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Special Considerations</label>
            <textarea
              value={specialConsiderations}
              onChange={(e) => setSpecialConsiderations(e.target.value)}
              rows={3}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white rounded-md py-3 font-medium hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit LOI"}
          </button>
        </form>
      </div>
    </main>
  );
}
