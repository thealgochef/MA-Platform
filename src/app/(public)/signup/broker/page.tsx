"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRIES } from "@/lib/constants";

export default function BrokerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    title: "",
    phoneNumber: "",
    linkedIn: "",
    firmName: "",
    firmWebsite: "",
    location: "",
    licenseCredentials: "",
    firmDescription: "",
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
    <main className="min-h-screen bg-surface py-12 text-text">
      <div className="max-w-2xl mx-auto">

        <div className="bg-bg rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold font-display text-primary mb-2">
            Broker Application
          </h1>
          <p className="mb-8">
            Complete your profile to join Geneva Holdings as a broker.
          </p>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Personal
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="e.g., (555) 123-4567"
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                LinkedIn Profile
              </label>
              <input
                type="url"
                value={formData.linkedIn}
                onChange={(e) =>
                  setFormData({ ...formData, linkedIn: e.target.value })
                }
                placeholder="https://www.linkedin.com/in/your-profile"
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Firm
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Firm Name *
              </label>
              <input
                type="text"
                required
                value={formData.firmName}
                onChange={(e) =>
                  setFormData({ ...formData, firmName: e.target.value })
                }
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.firmWebsite}
                onChange={(e) =>
                  setFormData({ ...formData, firmWebsite: e.target.value })
                }
                placeholder="https://"
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.firmDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    firmDescription: e.target.value,
                  })
                }
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Credentials & Accreditations
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
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
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>


            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Focus
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
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
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Industry Focus * (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((industry) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => handleIndustryToggle(industry)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${formData.industryFocus.includes(industry)
                      ? "bg-primary text-bg border-primary"
                      : "bg-bg text-[#757280] border-subtle hover:border-primary"
                      }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Invite
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Other Firm Members Who Need Access
              </label>
              <textarea
                rows={3}
                value={formData.otherMembers}
                onChange={(e) =>
                  setFormData({ ...formData, otherMembers: e.target.value })
                }
                placeholder="Email addresses, one per line"
                className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
              />
            </div>

            <div className="border-t border-subtle pt-6">
              <h3 className="text-xl font-semibold text-primary mb-4">
                Membership Agreement
              </h3>
              <div className="bg-surface rounded-md p-4 mb-4 text-sm max-h-48 overflow-y-auto">
                <p className="mb-2">
                  By signing this membership agreement, you agree to the terms
                  and conditions of the Geneva Holdings platform, including but
                  not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Honoring all signed NDAs</li>
                  <li>Providing accurate and truthful information</li>
                  <li>Adhering to platform guidelines for professional conduct</li>
                  <li>Acknowledging the fee structure (0.25% broker incentive on closed deals)</li>
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
                <span className="text-sm">
                  By submitting your application, you agree to our Terms of Service, Privacy Policy, and authorize Geneva Holdings to send you automated text messages. You can opt out at any time. *
                </span>
              </label>

              <div>
                <label className="block text-md font-medium text-primary mb-1">
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
                  className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
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
              className="w-full py-3 btn-primary rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
