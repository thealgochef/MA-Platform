"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRIES } from "@/lib/constants";

export default function BrokerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    firmName: "",
    firmWebsite: "",
    location: "",
    licenseCredentials: "",
    companyDescription: "",
    dealTypes: "",
    industryFocus: [] as string[],
    otherMembers: "",
    membershipAgreementSigned: false,
    signature: "",
  });

  const handleIndustryToggle = (industry: string) => {
    setFormData((prev) => ({
      ...prev,
      industryFocus: prev.industryFocus.includes(industry)
        ? prev.industryFocus.filter((i) => i !== industry)
        : [...prev.industryFocus, industry],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/signup/broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }

      router.push("/pending-approval");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-light-gray py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-navy mb-2">
            Broker Application
          </h1>
          <p className="text-text-secondary mb-8">
            Complete your profile to join Geneva Holdings as a broker.
          </p>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Firm Name *
              </label>
              <input
                type="text"
                required
                value={formData.firmName}
                onChange={(e) =>
                  setFormData({ ...formData, firmName: e.target.value })
                }
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Firm Website *
              </label>
              <input
                type="url"
                required
                value={formData.firmWebsite}
                onChange={(e) =>
                  setFormData({ ...formData, firmWebsite: e.target.value })
                }
                placeholder="https://"
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                License and Credentials *
              </label>
              <input
                type="text"
                required
                value={formData.licenseCredentials}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    licenseCredentials: e.target.value,
                  })
                }
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Company Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.companyDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    companyDescription: e.target.value,
                  })
                }
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Types of Deals Typically Represented *
              </label>
              <input
                type="text"
                required
                value={formData.dealTypes}
                onChange={(e) =>
                  setFormData({ ...formData, dealTypes: e.target.value })
                }
                placeholder="e.g., Lower middle market, $5M-$50M revenue"
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Industry Focus * (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((industry) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => handleIndustryToggle(industry)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                      formData.industryFocus.includes(industry)
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-text-secondary border-border-gray hover:border-slate-blue"
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Other Firm Members Who Need Access
              </label>
              <textarea
                rows={3}
                value={formData.otherMembers}
                onChange={(e) =>
                  setFormData({ ...formData, otherMembers: e.target.value })
                }
                placeholder="Email addresses, one per line"
                className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
              />
            </div>

            <div className="border-t border-border-gray pt-6">
              <h3 className="text-lg font-semibold text-navy mb-4">
                Membership Agreement
              </h3>
              <div className="bg-light-gray rounded-md p-4 mb-4 text-sm text-text-secondary max-h-48 overflow-y-auto">
                <p className="mb-2">
                  By signing this membership agreement, you agree to the terms
                  and conditions of the Geneva Holdings platform, including but
                  not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Maintaining confidentiality of all deal information</li>
                  <li>
                    Adhering to platform guidelines for professional conduct
                  </li>
                  <li>
                    Acknowledging the fee structure (0.25% broker incentive on
                    closed deals)
                  </li>
                  <li>Providing accurate and truthful information</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={formData.membershipAgreementSigned}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      membershipAgreementSigned: e.target.checked,
                    })
                  }
                  className="mt-1"
                />
                <span className="text-sm text-text-primary">
                  By submitting your application, you agree to our Terms of Service and Privacy Policy, and authorize Geneva Holdings to send you automated text messages. You can opt out at any time. *
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Electronic Signature *
                </label>
                <input
                  type="text"
                  required
                  value={formData.signature}
                  onChange={(e) =>
                    setFormData({ ...formData, signature: e.target.value })
                  }
                  placeholder="Type your full name as signature"
                  className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 focus:border-slate-blue"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !formData.membershipAgreementSigned ||
                formData.industryFocus.length === 0
              }
              className="w-full bg-navy text-white rounded-md py-3 font-medium hover:bg-slate-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
