"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface LOI {
  id: string;
  buyer_user_id: string;
  buyer_firm_id: string;
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

interface Engagement {
  id: string;
  users: { id: string; full_name: string } | null;
  firms: { id: string; name: string } | null;
}

export default function LOIComparePage() {
  const params = useParams();
  const dealId = params.id as string;
  const [lois, setLois] = useState<LOI[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/deals/${dealId}/buyers`);
      if (res.ok) {
        const data = await res.json();
        setLois(data.lois || []);
        setEngagements(data.engagements || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [dealId]);

  const getBuyerInfo = (buyerUserId: string) => {
    const eng = engagements.find(e => e.users?.id === buyerUserId);
    return {
      name: eng?.users?.full_name || "Unknown",
      firm: eng?.firms?.name || "Unknown",
    };
  };

  if (loading) {
    return <main className="min-h-screen bg-bg-alt p-8"><p className="text-text-secondary">Loading...</p></main>;
  }

  if (lois.length === 0) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-primary mb-4">LOI Comparison</h1>
          <p className="text-text-secondary">No LOIs to compare.</p>
        </div>
      </main>
    );
  }

  const rows: { label: string; key: string; format?: "currency" | "boolean" }[] = [
    { label: "Offer Price", key: "offer_price", format: "currency" },
    { label: "Multiple", key: "multiple" },
    { label: "Escrow", key: "escrow" },
    { label: "Timing", key: "timing" },
    { label: "Earnout", key: "earnout" },
    { label: "Rollover", key: "rollover" },
    { label: "Working Capital Peg", key: "working_capital_peg" },
    { label: "Cash at Close", key: "cash_at_close", format: "currency" },
    { label: "Platform Acquisition", key: "is_platform", format: "boolean" },
    { label: "Add-On Acquisition", key: "is_addon", format: "boolean" },
    { label: "Add-On Platform URL", key: "addon_platform_url" },
    { label: "Special Considerations", key: "special_considerations" },
  ];

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">LOI Comparison</h1>
          <a href={`/deals/${dealId}`} className="text-sm text-secondary hover:underline">Back to deal</a>
        </div>

        <div className="bg-surface-alt rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-gray bg-bg-alt">
                <th className="px-4 py-3 text-left font-medium text-text-secondary w-48">Field</th>
                {lois.map((loi) => {
                  const buyer = getBuyerInfo(loi.buyer_user_id);
                  return (
                    <th key={loi.id} className="px-4 py-3 text-left font-medium text-primary">
                      <div>{buyer.name}</div>
                      <div className="text-xs font-normal text-text-secondary">{buyer.firm}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border-gray">
                  <td className="px-4 py-3 font-medium text-text-secondary">{row.label}</td>
                  {lois.map((loi) => {
                    const val = (loi as unknown as Record<string, unknown>)[row.key];
                    let display: string;
                    if (val == null) display = "—";
                    else if (row.format === "currency") display = formatCurrency(val as number);
                    else if (row.format === "boolean") display = val ? "Yes" : "No";
                    else display = String(val);
                    return (
                      <td key={loi.id} className="px-4 py-3">{display}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
