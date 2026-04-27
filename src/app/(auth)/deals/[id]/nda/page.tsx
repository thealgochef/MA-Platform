"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface DealNDA {
  id: string;
  headline: string;
  nda_type: "platform" | "custom";
  nda_document_path: string | null;
}

interface Engagement {
  id: string;
  stage: string;
  nda_status: string;
}

export default function NDASigningPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;
  const [deal, setDeal] = useState<DealNDA | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [signatureCompany, setSignatureCompany] = useState("");
  const [signatureDate, setSignatureDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const fetchNDA = async () => {
      const res = await fetch(`/api/deals/${dealId}/nda`);
      if (res.ok) {
        const data = await res.json();
        setDeal(data.deal);
        setEngagement(data.engagement);
      } else {
        setError("NDA not available for this deal.");
      }
      setLoading(false);
    };
    fetchNDA();
  }, [dealId]);

  const handleSign = async () => {
    if (!signatureName || !signatureTitle || !signatureCompany || !signatureDate) {
      setError("Please fill in all signature fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          signatureName,
          signatureTitle,
          signatureCompany,
          signatureDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sign NDA");
      }
      router.push(`/deals/${dealId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to decline NDA");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading NDA...</p>
      </main>
    );
  }

  if (!deal || !engagement) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-error">{error || "NDA not available."}</p>
          <a href="/dashboard" className="text-sm text-secondary hover:underline mt-4 inline-block">Back to dashboard</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-primary mb-2">Non-Disclosure Agreement</h1>
        <p className="text-sm text-text-secondary mb-6">
          Deal: {deal.headline}
        </p>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">{error}</div>
        )}

        {/* NDA Document Display */}
        <div className="bg-surface-alt rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary mb-4">
            {deal.nda_type === "custom" ? "Custom NDA" : "Platform Standard NDA"}
          </h2>

          {deal.nda_type === "custom" && deal.nda_document_path ? (
            <div className="bg-bg-alt rounded-md p-4 mb-4">
              <p className="text-sm text-text-secondary">Custom NDA document uploaded by broker.</p>
              <a
                href={`/api/deals/${dealId}/documents?path=${encodeURIComponent(deal.nda_document_path)}`}
                className="text-sm text-secondary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View NDA Document
              </a>
            </div>
          ) : (
            <div className="bg-bg-alt rounded-md p-4 mb-4 text-sm text-text-secondary space-y-2">
              <p className="font-medium text-text">Geneva Holdings Platform NDA</p>
              <p>
                This Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into by the undersigned party
                (&quot;Receiving Party&quot;) and the sell-side representative (&quot;Disclosing Party&quot;) through
                the Geneva Holdings platform.
              </p>
              <p>
                The Receiving Party agrees to maintain the confidentiality of all information shared
                regarding the business opportunity identified above. This includes financial data,
                business operations, customer information, and any other proprietary information
                disclosed during the evaluation process.
              </p>
              <p>
                The Receiving Party shall not disclose any confidential information to third parties
                without the prior written consent of the Disclosing Party. This obligation shall
                survive for a period of two (2) years from the date of signing.
              </p>
            </div>
          )}
        </div>

        {/* Signature Fields */}
        <div className="bg-surface-alt rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-sm font-medium text-text mb-4">Electronic Signature</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Full Name *</label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                placeholder="Your full legal name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Title *</label>
              <input
                type="text"
                value={signatureTitle}
                onChange={(e) => setSignatureTitle(e.target.value)}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                placeholder="e.g., Managing Partner"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Company *</label>
              <input
                type="text"
                value={signatureCompany}
                onChange={(e) => setSignatureCompany(e.target.value)}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Date *</label>
              <input
                type="date"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSign}
            disabled={submitting}
            className="flex-1 bg-primary text-white rounded-md py-3 font-medium hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            {submitting ? "Signing..." : "Sign NDA"}
          </button>
          <button
            onClick={handleDecline}
            disabled={submitting}
            className="px-6 py-3 bg-surface-alt border border-border-gray text-text-secondary rounded-md font-medium hover:bg-bg-alt transition-colors disabled:opacity-50"
          >
            Decline NDA
          </button>
        </div>
      </div>
    </main>
  );
}
