"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Closure {
  id: string;
  enterprise_value: number;
  buyer_confirmed: boolean;
  broker_confirmed: boolean;
  broker_disputed: boolean;
  success_fee: number | null;
  broker_incentive: number | null;
  closed_at: string;
}

export default function DealClosurePage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [closure, setClosure] = useState<Closure | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enterpriseValue, setEnterpriseValue] = useState<number | "">("");

  useEffect(() => {
    const fetchClosure = async () => {
      const res = await fetch(`/api/deals/${dealId}/close`);
      if (res.ok) {
        const data = await res.json();
        setClosure(data.closure);
      }
      setLoading(false);
    };
    fetchClosure();
  }, [dealId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enterpriseValue: Number(enterpriseValue),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit closure");
      }

      const data = await res.json();
      setClosure(data.closure);
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

  // Already submitted — show status
  if (closure) {
    return (
      <main className="min-h-screen bg-bg-alt py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-primary mb-6">Deal Closure</h1>
          <div className="bg-surface-alt rounded-lg shadow-md p-6 space-y-4">
            <div>
              <p className="text-sm text-text-secondary">Enterprise Value</p>
              <p className="text-lg font-semibold text-primary">
                ${closure.enterprise_value.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-text-secondary">Buyer Confirmed</p>
                <p className="text-sm font-medium">{closure.buyer_confirmed ? "Yes" : "Pending"}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Broker Confirmed</p>
                <p className="text-sm font-medium">
                  {closure.broker_disputed
                    ? "Disputed"
                    : closure.broker_confirmed
                      ? "Yes"
                      : "Pending"}
                </p>
              </div>
            </div>
            {closure.success_fee && (
              <div>
                <p className="text-sm text-text-secondary">Success Fee (1.25%)</p>
                <p className="text-sm font-medium">${closure.success_fee.toLocaleString()}</p>
              </div>
            )}
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-secondary hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Show form to report enterprise value
  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-primary mb-2">Deal Closure Form</h1>
        <p className="text-sm text-text-secondary mb-6">
          Congratulations! Please report the final enterprise value for this deal,
          including all earnouts and future payments.
        </p>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-surface-alt rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Total Enterprise Value ($) *
            </label>
            <input
              type="number"
              value={enterpriseValue}
              onChange={(e) => setEnterpriseValue(e.target.value ? Number(e.target.value) : "")}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
              placeholder="Include all earnouts and future payments"
              required
              min={1}
            />
            <p className="text-xs text-text-secondary mt-1">
              A 1.25% success fee will be calculated on this amount.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white rounded-md py-3 font-medium hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Report Enterprise Value"}
          </button>
        </form>
      </div>
    </main>
  );
}
